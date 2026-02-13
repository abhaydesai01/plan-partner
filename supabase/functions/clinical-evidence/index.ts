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

    const { patient_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY is not configured");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Get patient data
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

    // Build search query from patient conditions and medications
    const conditions = patient.conditions?.length ? patient.conditions.join(", ") : "";
    const medications = patient.medications?.length ? patient.medications.join(", ") : "";
    const age = patient.age ? `${patient.age} year old` : "";
    const gender = patient.gender ?? "";

    if (!conditions && !medications) {
      return new Response(JSON.stringify({ error: "No conditions or medications recorded for this patient to search evidence for." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchQuery = `Latest clinical guidelines and evidence-based treatment recommendations for ${age} ${gender} patient with: ${conditions}. ${medications ? `Currently on: ${medications}.` : ""} Focus on peer-reviewed research, meta-analyses, and clinical practice guidelines.`;

    // Step 1: Search academic sources with Perplexity
    const perplexityResp = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a medical research assistant. Return relevant clinical studies, guidelines, and evidence for the given patient profile. For each source, provide the title, a 1-2 line summary of the key finding, and the URL. Only use real sources from your search results. Do not fabricate any studies."
          },
          { role: "user", content: searchQuery },
        ],
        search_mode: "academic",
        search_recency_filter: "year",
      }),
    });

    if (!perplexityResp.ok) {
      const errText = await perplexityResp.text();
      console.error("Perplexity API error:", perplexityResp.status, errText);
      return new Response(JSON.stringify({ error: "Evidence search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perplexityData = await perplexityResp.json();
    const rawEvidence = perplexityData.choices?.[0]?.message?.content ?? "";
    const citations = perplexityData.citations ?? [];

    // Step 2: Use Gemini to format evidence for THIS patient
    const patientSummary = `Patient: ${patient.full_name}, ${age} ${gender}. Conditions: ${conditions || "None"}. Medications: ${medications || "None"}.`;

    const formatSystemPrompt = `You are a Clinical Evidence Assistant. Given a patient summary and research evidence, select the 3-5 most clinically relevant sources and format them.

Rules:
- Do NOT fabricate studies. Use ONLY the provided evidence.
- No speculation.
- Keep concise, professional tone.

OUTPUT FORMAT (use markdown):

## Relevant Evidence

### 1. [Title]
- **Key finding:** One-line summary
- **Relevance to patient:** Why this matters for THIS patient
- **Source:** [Link](url)

Repeat for each source (3-5 max).

If citations are available, use them as source links. Otherwise use any URLs from the evidence text.`;

    const formatResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: formatSystemPrompt }] },
          contents: [{
            role: "user",
            parts: [{ text: `PATIENT SUMMARY:\n${patientSummary}\n\nRESEARCH EVIDENCE:\n${rawEvidence}\n\nCITATIONS:\n${citations.map((c: string, i: number) => `[${i + 1}] ${c}`).join("\n")}` }],
          }],
        }),
      }
    );

    if (!formatResp.ok) {
      // Fall back to raw evidence if formatting fails
      return new Response(JSON.stringify({ content: rawEvidence, citations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formatData = await formatResp.json();
    const formattedContent = formatData.candidates?.[0]?.content?.parts?.[0]?.text ?? rawEvidence;

    return new Response(JSON.stringify({ content: formattedContent, citations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("clinical-evidence error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
