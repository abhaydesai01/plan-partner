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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get caller's auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, target_user_id } = await req.json();

    if (!target_user_id || !["deactivate", "regenerate"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid request. Provide action (deactivate|regenerate) and target_user_id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin/owner in a clinic that includes the target doctor
    const { data: callerMemberships } = await supabase
      .from("clinic_members")
      .select("clinic_id, role")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"]);

    if (!callerMemberships || callerMemberships.length === 0) {
      return new Response(JSON.stringify({ error: "You must be a clinic owner or admin." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClinicIds = callerMemberships.map((m) => m.clinic_id);

    // Verify target is in one of those clinics
    const { data: targetMembership } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("user_id", target_user_id)
      .in("clinic_id", callerClinicIds)
      .limit(1)
      .maybeSingle();

    if (!targetMembership) {
      return new Response(JSON.stringify({ error: "Target doctor is not in your clinic." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deactivate") {
      const { error } = await supabase
        .from("profiles")
        .update({ doctor_code: null })
        .eq("user_id", target_user_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, doctor_code: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "regenerate") {
      const newCode = crypto.randomUUID().replace(/-/g, "").substring(0, 6).toUpperCase();

      // Check uniqueness
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("doctor_code", newCode)
        .maybeSingle();

      const finalCode = existing
        ? crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()
        : newCode;

      const { error } = await supabase
        .from("profiles")
        .update({ doctor_code: finalCode })
        .eq("user_id", target_user_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, doctor_code: finalCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("manage-doctor-code error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
