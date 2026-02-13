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

    const body = await req.json();
    const imageBase64 = body.image_base64 as string | undefined;
    const imageUrl = body.image_url as string | undefined;
    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "image_base64 or image_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const systemPrompt = `You are a nutrition parser. Analyze the meal image and extract food items.

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
  "notes": "brief description of the meal or any relevant dietary note"
}

Guidelines:
- Infer meal_type from the type of food (e.g. eggs, toast, cereal → breakfast; rice, curry → lunch/dinner; small items → snack)
- For Indian foods, use common serving sizes (1 roti ≈ 120cal, 1 bowl rice ≈ 200cal, 1 bowl dal ≈ 150cal)
- Estimate calories and macros reasonably; be conservative
- If the image is unclear or not food, return meal_type "other" and describe what you see in notes
- Always return valid JSON, nothing else`;

    let imageBase64Final = imageBase64;
    let mimeType = (body.mime_type as string) || "image/jpeg";
    if (imageUrl && !imageBase64Final) {
      try {
        const imgResp = await fetch(imageUrl);
        if (!imgResp.ok) throw new Error("Failed to fetch image");
        const blob = await imgResp.arrayBuffer();
        imageBase64Final = btoa(String.fromCharCode(...new Uint8Array(blob)));
        mimeType = imgResp.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      } catch (e) {
        console.error("Image fetch error:", e);
        return new Response(JSON.stringify({ error: "Could not fetch image from URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!imageBase64Final) {
      return new Response(JSON.stringify({ error: "image_base64 or image_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
      { text: "Analyze this meal image and extract the food items. Return only the JSON." },
      { inlineData: { mimeType, data: imageBase64Final } },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    let parsed: { meal_type?: string; food_items?: unknown[]; notes?: string };
    try {
      parsed = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Could not parse food data", raw: content }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = Array.isArray(parsed.food_items) ? parsed.food_items : [];
    const totalCalories = items.reduce((s: number, i: { calories?: number }) => s + (i.calories || 0), 0);
    const totalProtein = items.reduce((s: number, i: { protein?: number }) => s + (i.protein || 0), 0);
    const totalCarbs = items.reduce((s: number, i: { carbs?: number }) => s + (i.carbs || 0), 0);
    const totalFat = items.reduce((s: number, i: { fat?: number }) => s + (i.fat || 0), 0);

    return new Response(
      JSON.stringify({
        meal_type: parsed.meal_type || "other",
        food_items: items,
        notes: parsed.notes || null,
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-meal-image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
