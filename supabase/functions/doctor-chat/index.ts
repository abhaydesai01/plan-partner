import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify the doctor
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a doctor
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "doctor")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Access denied. Doctors only." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, patient_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Verify doctor owns this patient
    const { data: patient } = await serviceClient
      .from("patients")
      .select("*")
      .eq("id", patient_id)
      .eq("doctor_id", user.id)
      .maybeSingle();

    if (!patient) {
      return new Response(JSON.stringify({ error: "Patient not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build comprehensive patient context
    const contextParts: string[] = [];

    contextParts.push(`PATIENT DEMOGRAPHICS:
- Name: ${patient.full_name}
- Age: ${patient.age ?? "Unknown"}
- Gender: ${patient.gender ?? "Unknown"}
- Phone: ${patient.phone}
- Status: ${patient.status}
- Emergency Contact: ${patient.emergency_contact ?? "Not provided"}
- Language: ${patient.language_preference ?? "en"}
- Last Check-in: ${patient.last_check_in ? new Date(patient.last_check_in).toLocaleDateString() : "Never"}`);

    contextParts.push(`CONDITIONS: ${patient.conditions?.length ? patient.conditions.join(", ") : "None recorded"}`);
    contextParts.push(`MEDICATIONS: ${patient.medications?.length ? patient.medications.join(", ") : "None recorded"}`);

    // Fetch vitals
    const { data: vitals } = await serviceClient
      .from("vitals")
      .select("vital_type, value_text, value_numeric, unit, recorded_at, notes")
      .eq("patient_id", patient.id)
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (vitals?.length) {
      contextParts.push(`VITALS HISTORY (${vitals.length} records, newest first):\n` +
        vitals.map(v => `- [${new Date(v.recorded_at).toLocaleDateString()}] ${v.vital_type}: ${v.value_text}${v.unit ? ` ${v.unit}` : ""}${v.value_numeric !== null ? ` (numeric: ${v.value_numeric})` : ""}${v.notes ? ` | Note: ${v.notes}` : ""}`).join("\n"));
    } else {
      contextParts.push("VITALS HISTORY: No vitals recorded.");
    }

    // Fetch lab results
    const { data: labs } = await serviceClient
      .from("lab_results")
      .select("test_name, result_value, unit, reference_range, status, tested_at, notes")
      .eq("patient_id", patient.id)
      .order("tested_at", { ascending: false })
      .limit(50);

    if (labs?.length) {
      contextParts.push(`LAB RESULTS (${labs.length} records, newest first):\n` +
        labs.map(l => `- [${new Date(l.tested_at).toLocaleDateString()}] ${l.test_name}: ${l.result_value}${l.unit ? ` ${l.unit}` : ""} | Ref: ${l.reference_range ?? "N/A"} | Status: ${l.status}${l.notes ? ` | Note: ${l.notes}` : ""}`).join("\n"));
    } else {
      contextParts.push("LAB RESULTS: No lab results recorded.");
    }

    // Fetch appointments
    const { data: appointments } = await serviceClient
      .from("appointments")
      .select("title, scheduled_at, duration_minutes, status, notes")
      .eq("patient_id", patient.id)
      .order("scheduled_at", { ascending: false })
      .limit(20);

    if (appointments?.length) {
      contextParts.push(`APPOINTMENTS (${appointments.length} records):\n` +
        appointments.map(a => `- [${new Date(a.scheduled_at).toLocaleString()}] ${a.title} (${a.duration_minutes}min, ${a.status})${a.notes ? ` | Note: ${a.notes}` : ""}`).join("\n"));
    } else {
      contextParts.push("APPOINTMENTS: None.");
    }

    // Fetch enrollments with program details
    const { data: enrollments } = await serviceClient
      .from("enrollments")
      .select("*, programs(name, type, description, duration_days)")
      .eq("patient_id", patient.id)
      .order("enrolled_at", { ascending: false });

    if (enrollments?.length) {
      contextParts.push(`CARE PROGRAMS:\n` +
        enrollments.map(e => {
          const p = e.programs as any;
          return `- ${p?.name ?? "Unknown"} (${p?.type ?? ""}, ${p?.duration_days ?? 0} days): Status=${e.status}, Adherence=${e.adherence_pct ?? "N/A"}%, Enrolled: ${new Date(e.enrolled_at).toLocaleDateString()}`;
        }).join("\n"));
    } else {
      contextParts.push("CARE PROGRAMS: None enrolled.");
    }

    // Fetch documents
    const { data: docs } = await serviceClient
      .from("patient_documents")
      .select("file_name, category, notes, created_at")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (docs?.length) {
      contextParts.push(`DOCUMENTS (${docs.length}):\n` +
        docs.map(d => `- [${new Date(d.created_at).toLocaleDateString()}] ${d.file_name} [${d.category}]${d.notes ? ` | Note: ${d.notes}` : ""}`).join("\n"));
    } else {
      contextParts.push("DOCUMENTS: None uploaded.");
    }

    // Fetch alerts
    const { data: alerts } = await serviceClient
      .from("alerts")
      .select("title, description, severity, status, alert_type, created_at, resolution_notes, resolved_at")
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (alerts?.length) {
      contextParts.push(`CLINICAL ALERTS (${alerts.length}):\n` +
        alerts.map(a => `- [${new Date(a.created_at).toLocaleDateString()}] [${a.severity.toUpperCase()}] ${a.title}: ${a.description} | Status: ${a.status}${a.resolved_at ? ` | Resolved: ${new Date(a.resolved_at).toLocaleDateString()}` : ""}${a.resolution_notes ? ` | Resolution: ${a.resolution_notes}` : ""}`).join("\n"));
    } else {
      contextParts.push("CLINICAL ALERTS: None.");
    }

    const systemPrompt = `You are Mediimate Clinical Copilot, an AI assistant designed ONLY to help licensed doctors analyze a specific patient's medical data.

You are NOT a general chatbot.
You MUST answer ONLY using the patient data provided in the context.
Never invent facts.
Never guess.
If data is missing, say: "Not available in patient records."

Your role:
- Analyze patient vitals, labs, medications, history, notes, and documents
- Detect abnormalities, risks, and trends
- Highlight clinically relevant issues
- Provide concise medical insights
- Suggest possible next clinical actions (not prescriptions)
- Use professional medical tone
- Be short, structured, and actionable

STRICT RULES:
- Do NOT provide legal or liability statements
- Do NOT say "consult a doctor" (the user IS a doctor)
- Do NOT hallucinate
- Do NOT use external knowledge beyond provided patient context
- Base answers ONLY on the given records

Response format:
1. Key Findings
2. Abnormalities/Risks
3. Trend Analysis (if applicable)
4. Suggested Clinical Considerations

If asked to summarize, provide structured bullet summary.
You are assisting a trained medical professional.
Be precise, clinical, and efficient.

--- PATIENT RECORDS ---
${contextParts.join("\n\n")}
--- END OF RECORDS ---`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("doctor-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
