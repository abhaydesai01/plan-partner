import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const { message, patient_id, doctor_id } = await req.json();
    if (!message || !patient_id || !doctor_id) {
      return new Response(JSON.stringify({ error: "message, patient_id, and doctor_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const systemPrompt = `You are a nutrition parser. Extract food items from the user's message describing what they ate.

Return ONLY valid JSON with this exact structure:
{
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack" | "other",
  "food_items": [
    {
      "name": "food name",
      "quantity": number,
      "unit": "serving/cup/piece/g/ml/bowl/plate/roti/chapati",
      "calories": estimated_number,
      "protein": estimated_grams,
      "carbs": estimated_grams,
      "fat": estimated_grams
    }
  ],
  "notes": "any relevant dietary note"
}

Guidelines:
- Infer meal_type from time context or food type (e.g. "morning" → breakfast, "chai with biscuits" → snack)
- For Indian foods, use common serving sizes (1 roti ≈ 120cal, 1 bowl rice ≈ 200cal, 1 bowl dal ≈ 150cal)
- Estimate calories and macros reasonably; be conservative
- If message is unclear, still extract what you can
- Always return valid JSON, nothing else`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI parsing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Could not parse food data", raw: content }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate totals
    const items = parsed.food_items || [];
    const totalCalories = items.reduce((s: number, i: any) => s + (i.calories || 0), 0);
    const totalProtein = items.reduce((s: number, i: any) => s + (i.protein || 0), 0);
    const totalCarbs = items.reduce((s: number, i: any) => s + (i.carbs || 0), 0);
    const totalFat = items.reduce((s: number, i: any) => s + (i.fat || 0), 0);

    // Insert into food_logs using service client
    const { data: log, error: insertError } = await serviceClient
      .from("food_logs")
      .insert({
        patient_id,
        doctor_id,
        meal_type: parsed.meal_type || "other",
        food_items: items,
        raw_message: message,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat,
        notes: parsed.notes || null,
        source: "whatsapp",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save food log" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, food_log: log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-food-log error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
