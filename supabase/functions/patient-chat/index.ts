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

    // Verify the user
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

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch all patient records for context
    const { data: patient } = await serviceClient
      .from("patients")
      .select("*")
      .eq("patient_user_id", user.id)
      .maybeSingle();

    let contextParts: string[] = [];

    if (patient) {
      contextParts.push(`PATIENT PROFILE:
- Name: ${patient.full_name}
- Age: ${patient.age || "Unknown"}
- Gender: ${patient.gender || "Unknown"}
- Conditions: ${patient.conditions?.join(", ") || "None"}
- Medications: ${patient.medications?.join(", ") || "None"}
- Emergency Contact: ${patient.emergency_contact || "None"}
- Language: ${patient.language_preference || "en"}
- Status: ${patient.status}`);

      // Fetch vitals
      const { data: vitals } = await serviceClient
        .from("vitals")
        .select("vital_type, value_text, value_numeric, unit, recorded_at, notes")
        .eq("patient_id", patient.id)
        .order("recorded_at", { ascending: false })
        .limit(20);

      if (vitals?.length) {
        contextParts.push(`RECENT VITALS (last ${vitals.length} records):\n` +
          vitals.map(v => `- ${v.vital_type}: ${v.value_text}${v.unit ? ` ${v.unit}` : ""} (${new Date(v.recorded_at).toLocaleDateString()})${v.notes ? ` — ${v.notes}` : ""}`).join("\n"));
      }

      // Fetch lab results
      const { data: labs } = await serviceClient
        .from("lab_results")
        .select("test_name, result_value, unit, reference_range, status, tested_at, notes")
        .eq("patient_id", patient.id)
        .order("tested_at", { ascending: false })
        .limit(20);

      if (labs?.length) {
        contextParts.push(`LAB RESULTS (last ${labs.length} records):\n` +
          labs.map(l => `- ${l.test_name}: ${l.result_value}${l.unit ? ` ${l.unit}` : ""} (ref: ${l.reference_range || "N/A"}) [${l.status}] (${new Date(l.tested_at).toLocaleDateString()})${l.notes ? ` — ${l.notes}` : ""}`).join("\n"));
      }

      // Fetch appointments
      const { data: appointments } = await serviceClient
        .from("appointments")
        .select("title, scheduled_at, duration_minutes, status, notes")
        .eq("patient_id", patient.id)
        .order("scheduled_at", { ascending: false })
        .limit(10);

      if (appointments?.length) {
        contextParts.push(`APPOINTMENTS (last ${appointments.length}):\n` +
          appointments.map(a => `- ${a.title}: ${new Date(a.scheduled_at).toLocaleString()} (${a.duration_minutes}min, ${a.status})${a.notes ? ` — ${a.notes}` : ""}`).join("\n"));
      }

      // Fetch enrollments
      const { data: enrollments } = await serviceClient
        .from("enrollments")
        .select("*, programs(name, type, description, duration_days)")
        .eq("patient_id", patient.id)
        .order("enrolled_at", { ascending: false });

      if (enrollments?.length) {
        contextParts.push(`CARE PROGRAMS:\n` +
          enrollments.map(e => {
            const p = e.programs as any;
            return `- ${p?.name || "Unknown"} (${p?.type || ""}, ${p?.duration_days || 0} days): Status=${e.status}, Adherence=${e.adherence_pct ?? "N/A"}%`;
          }).join("\n"));
      }

      // Fetch documents list
      const { data: docs } = await serviceClient
        .from("patient_documents")
        .select("file_name, category, notes, created_at")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (docs?.length) {
        contextParts.push(`DOCUMENTS (last ${docs.length}):\n` +
          docs.map(d => `- ${d.file_name} [${d.category}] (${new Date(d.created_at).toLocaleDateString()})${d.notes ? ` — ${d.notes}` : ""}`).join("\n"));
      }
    }

    const systemPrompt = `You are Mediimate AI — a caring, knowledgeable health assistant for patients. You have access to the patient's complete health records provided below.

IMPORTANT RULES:
- You are NOT a doctor. Always recommend consulting their doctor for medical decisions.
- Answer questions about their health data clearly and simply.
- If they ask about vitals, labs, appointments, or medications — refer to their actual records below.
- Be empathetic, warm, and encouraging. Use their name when appropriate.
- Keep answers concise but thorough.
- If you don't have enough data to answer, say so honestly.
- Never make up or fabricate health data.
- For any concerning symptoms or results, always advise contacting their healthcare provider.

${contextParts.length > 0 ? "--- PATIENT HEALTH RECORDS ---\n" + contextParts.join("\n\n") : "No patient records found. The patient may not be linked to a doctor yet."}

--- END OF RECORDS ---

Respond in a friendly, professional tone. If the patient greets you, greet them back using their name.`;

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
    console.error("patient-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
