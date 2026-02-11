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

    // Fetch ALL patient records for this user (across multiple doctors/clinics)
    const { data: patients } = await serviceClient
      .from("patients")
      .select("*")
      .eq("patient_user_id", user.id);

    const patientIds = patients?.map(p => p.id) || [];
    const contextParts: string[] = [];

    // Get user profile as fallback for name
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (patients?.length) {
      // Merge patient info — use the most complete record
      const primary = patients[0];
      const allConditions = [...new Set(patients.flatMap(p => p.conditions || []))];
      const allMedications = [...new Set(patients.flatMap(p => p.medications || []))];

      contextParts.push(`PATIENT PROFILE:
- Name: ${primary.full_name || profile?.full_name || "Unknown"}
- Age: ${primary.age || "Unknown"}
- Gender: ${primary.gender || "Unknown"}
- Conditions: ${allConditions.length ? allConditions.join(", ") : "None recorded"}
- Medications: ${allMedications.length ? allMedications.join(", ") : "None recorded"}
- Emergency Contact: ${primary.emergency_contact || "None"}
- Language: ${primary.language_preference || "en"}
- Status: ${primary.status}
- Connected Doctors: ${patients.length}`);
    } else if (profile) {
      // Patient has an account but no doctor-created records yet
      contextParts.push(`PATIENT PROFILE:
- Name: ${profile.full_name || user.user_metadata?.full_name || "Unknown"}
- Note: This patient has a self-managed account. They may have uploaded their own vitals, labs, and documents.`);
    }

    if (patientIds.length > 0) {
      // Fetch vitals across ALL patient records
      const { data: vitals } = await serviceClient
        .from("vitals")
        .select("vital_type, value_text, value_numeric, unit, recorded_at, notes")
        .in("patient_id", patientIds)
        .order("recorded_at", { ascending: false })
        .limit(30);

      if (vitals?.length) {
        contextParts.push(`RECENT VITALS (last ${vitals.length} records):\n` +
          vitals.map(v => `- ${v.vital_type}: ${v.value_text}${v.unit ? ` ${v.unit}` : ""} (${new Date(v.recorded_at).toLocaleDateString()})${v.notes ? ` — ${v.notes}` : ""}`).join("\n"));
      }

      // Fetch lab results across ALL patient records
      const { data: labs } = await serviceClient
        .from("lab_results")
        .select("test_name, result_value, unit, reference_range, status, tested_at, notes")
        .in("patient_id", patientIds)
        .order("tested_at", { ascending: false })
        .limit(30);

      if (labs?.length) {
        contextParts.push(`LAB RESULTS (last ${labs.length} records):\n` +
          labs.map(l => `- ${l.test_name}: ${l.result_value}${l.unit ? ` ${l.unit}` : ""} (ref: ${l.reference_range || "N/A"}) [${l.status}] (${new Date(l.tested_at).toLocaleDateString()})${l.notes ? ` — ${l.notes}` : ""}`).join("\n"));
      }

      // Fetch appointments across ALL patient records
      const { data: appointments } = await serviceClient
        .from("appointments")
        .select("title, scheduled_at, duration_minutes, status, notes")
        .in("patient_id", patientIds)
        .order("scheduled_at", { ascending: false })
        .limit(15);

      if (appointments?.length) {
        contextParts.push(`APPOINTMENTS (last ${appointments.length}):\n` +
          appointments.map(a => `- ${a.title}: ${new Date(a.scheduled_at).toLocaleString()} (${a.duration_minutes}min, ${a.status})${a.notes ? ` — ${a.notes}` : ""}`).join("\n"));
      }

      // Fetch enrollments across ALL patient records
      const { data: enrollments } = await serviceClient
        .from("enrollments")
        .select("*, programs(name, type, description, duration_days)")
        .in("patient_id", patientIds)
        .order("enrolled_at", { ascending: false });

      if (enrollments?.length) {
        contextParts.push(`CARE PROGRAMS:\n` +
          enrollments.map(e => {
            const p = e.programs as any;
            return `- ${p?.name || "Unknown"} (${p?.type || ""}, ${p?.duration_days || 0} days): Status=${e.status}, Adherence=${e.adherence_pct ?? "N/A"}%`;
          }).join("\n"));
      }

      // Fetch documents across ALL patient records
      const { data: docs } = await serviceClient
        .from("patient_documents")
        .select("file_name, category, notes, created_at")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false })
        .limit(15);

      if (docs?.length) {
        contextParts.push(`DOCUMENTS (last ${docs.length}):\n` +
          docs.map(d => `- ${d.file_name} [${d.category}] (${new Date(d.created_at).toLocaleDateString()})${d.notes ? ` — ${d.notes}` : ""}`).join("\n"));
      }

      // Fetch food logs across ALL patient records
      const { data: foodLogs } = await serviceClient
        .from("food_logs")
        .select("meal_type, food_items, total_calories, total_protein, total_carbs, total_fat, logged_at, notes")
        .in("patient_id", patientIds)
        .order("logged_at", { ascending: false })
        .limit(10);

      if (foodLogs?.length) {
        contextParts.push(`RECENT FOOD LOGS (last ${foodLogs.length}):\n` +
          foodLogs.map(f => {
            const items = Array.isArray(f.food_items) ? f.food_items.map((i: any) => i.name || i).join(", ") : "Unknown";
            return `- ${f.meal_type}: ${items} | Cal: ${f.total_calories || "?"}, Protein: ${f.total_protein || "?"}g, Carbs: ${f.total_carbs || "?"}g, Fat: ${f.total_fat || "?"}g (${new Date(f.logged_at).toLocaleDateString()})${f.notes ? ` — ${f.notes}` : ""}`;
          }).join("\n"));
      }

      // Fetch alerts across ALL patient records
      const { data: alerts } = await serviceClient
        .from("alerts")
        .select("title, description, severity, status, alert_type, created_at")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (alerts?.length) {
        contextParts.push(`HEALTH ALERTS:\n` +
          alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description} (${a.status}, ${new Date(a.created_at).toLocaleDateString()})`).join("\n"));
      }
    }

    const patientName = patients?.[0]?.full_name || profile?.full_name || user.user_metadata?.full_name || "there";

    const systemPrompt = `You are Mediimate AI — a caring, knowledgeable health assistant for patients. You have access to the patient's complete health records provided below.

IMPORTANT RULES:
- You are NOT a doctor. Always recommend consulting their doctor for medical decisions.
- Answer questions about their health data clearly and simply.
- If they ask about vitals, labs, appointments, medications, food logs, or documents — refer to their actual records below.
- Be empathetic, warm, and encouraging. Use their name when appropriate. The patient's name is ${patientName}.
- Keep answers concise but thorough.
- If you don't have specific data for what they're asking, say so honestly but still try to help with general guidance.
- Never make up or fabricate health data.
- For any concerning symptoms or results, always advise contacting their healthcare provider.
- The patient may have records from multiple doctors — present information holistically.
- If there are no records yet, encourage the patient to upload their health data through the portal or connect with a doctor.

${contextParts.length > 0 ? "--- PATIENT HEALTH RECORDS ---\n" + contextParts.join("\n\n") : "No health records found yet. The patient may be new or hasn't uploaded any data yet. Encourage them to use the portal to add their vitals, lab results, and documents, or connect with a doctor."}

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
