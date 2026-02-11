import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    { email: "doctor@demo.com", password: "Demo@1234", full_name: "Dr. Demo Doctor", role: "doctor" },
    { email: "patient@demo.com", password: "Demo@1234", full_name: "Demo Patient", role: "patient" },
    { email: "clinic@demo.com", password: "Demo@1234", full_name: "Dr. Clinic Admin", role: "doctor" },
  ];

  const results = [];

  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    });

    if (error) {
      results.push({ email: u.email, error: error.message });
    } else {
      results.push({ email: u.email, id: data.user.id, success: true });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
