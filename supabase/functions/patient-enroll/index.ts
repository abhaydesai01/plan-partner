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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      // Lookup doctor by code and return their public info + programs
      const url = new URL(req.url);
      const doctorCode = url.searchParams.get("code")?.toUpperCase();

      if (!doctorCode) {
        return new Response(JSON.stringify({ error: "Missing doctor code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, specialties, doctor_code")
        .eq("doctor_code", doctorCode)
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Doctor not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get doctor's active programs
      const { data: programs } = await supabase
        .from("programs")
        .select("id, name, type, description, duration_days")
        .eq("doctor_id", profile.user_id)
        .eq("is_active", true);

      // Get doctor's clinic info
      const { data: membership } = await supabase
        .from("clinic_members")
        .select("clinics(name, address, phone)")
        .eq("user_id", profile.user_id)
        .limit(1)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          doctor: {
            name: profile.full_name,
            specialties: profile.specialties || [],
            code: profile.doctor_code,
          },
          clinic: membership ? (membership.clinics as any) : null,
          programs: programs || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      // Create patient + optionally enroll in program
      const body = await req.json();
      const {
        doctor_code,
        full_name,
        phone,
        age,
        gender,
        conditions,
        medications,
        emergency_contact,
        language_preference,
        program_id,
      } = body;

      if (!doctor_code || !full_name || !phone) {
        return new Response(
          JSON.stringify({ error: "doctor_code, full_name, and phone are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Look up doctor
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("doctor_code", doctor_code.toUpperCase())
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Doctor not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Normalize phone
      let normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, "");
      if (normalizedPhone.startsWith("0")) normalizedPhone = "+91" + normalizedPhone.slice(1);
      if (!normalizedPhone.startsWith("+")) normalizedPhone = "+91" + normalizedPhone;

      // Check for duplicate
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("doctor_id", profile.user_id)
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "A patient with this phone number is already registered." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get clinic_id for this doctor
      const { data: membership } = await supabase
        .from("clinic_members")
        .select("clinic_id")
        .eq("user_id", profile.user_id)
        .limit(1)
        .maybeSingle();

      // Insert patient with consent
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

      const { data: patient, error: insertError } = await supabase
        .from("patients")
        .insert({
          doctor_id: profile.user_id,
          clinic_id: membership?.clinic_id || null,
          full_name,
          phone: normalizedPhone,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          conditions: conditions ? conditions.split(";").map((c: string) => c.trim()).filter(Boolean) : [],
          medications: medications ? medications.split(";").map((m: string) => m.trim()).filter(Boolean) : [],
          emergency_contact: emergency_contact || null,
          language_preference: language_preference || "en",
          consent_given_at: new Date().toISOString(),
          consent_ip: clientIp,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Optionally enroll in a program
      let enrollmentId = null;
      if (program_id && patient) {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .insert({
            patient_id: patient.id,
            program_id,
            doctor_id: profile.user_id,
          })
          .select("id")
          .single();
        enrollmentId = enrollment?.id || null;
      }

      // Create a notification for the doctor
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        title: `New patient enrolled: ${full_name}`,
        message: `${full_name} (${normalizedPhone}) self-enrolled via your enrollment link.${program_id ? " Enrolled in a program." : ""}`,
        type: "success",
        category: "enrollment",
        related_id: patient?.id || null,
        related_type: "patient",
      });

      return new Response(
        JSON.stringify({
          success: true,
          patient_id: patient?.id,
          enrollment_id: enrollmentId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("patient-enroll error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
