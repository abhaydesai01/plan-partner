import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointment_id, doctor_id, patient_id, completion_remarks } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get doctor's clinic membership
    const { data: membership } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("user_id", doctor_id)
      .limit(1)
      .maybeSingle();

    // Create feedback request
    const { data: feedbackReq, error: frError } = await supabase
      .from("feedback_requests")
      .insert({
        appointment_id,
        doctor_id,
        patient_id,
        clinic_id: membership?.clinic_id || null,
        completion_remarks: completion_remarks || null,
      })
      .select("id, token")
      .single();

    if (frError) {
      console.error("Error creating feedback request:", frError);
      throw frError;
    }

    // Get patient details
    const { data: patient } = await supabase
      .from("patients")
      .select("full_name, patient_user_id, phone")
      .eq("id", patient_id)
      .single();

    // Get doctor name
    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", doctor_id)
      .single();

    const doctorName = doctorProfile?.full_name || "Your Doctor";
    const patientName = patient?.full_name || "Patient";
    const feedbackUrl = `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "").replace("https://", "https://")}/feedback?token=${feedbackReq.token}`;

    // Construct a proper feedback URL using the app's domain
    // We use the origin from the request's referer or a configured URL
    const appUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || "";
    const properFeedbackUrl = `${appUrl}/feedback?token=${feedbackReq.token}`;

    // Create in-app notification for the patient
    if (patient?.patient_user_id) {
      await supabase.from("notifications").insert({
        user_id: patient.patient_user_id,
        title: "Appointment Completed ✅",
        message: `Your appointment with ${doctorName} has been completed. ${completion_remarks ? `Notes: ${completion_remarks}` : ""} Please share your feedback!`,
        type: "success",
        category: "appointment",
        related_id: appointment_id,
        related_type: "appointment",
      });
    }

    // Send email if Resend is configured
    if (resendKey && patient?.patient_user_id) {
      // Get patient email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(patient.patient_user_id);
      const patientEmail = authUser?.user?.email;

      if (patientEmail) {
        const resend = new Resend(resendKey);

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Completed ✅</h1>
            </div>
            <div style="background: #f8fafa; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="font-size: 16px; color: #1a1a1a;">Hi ${patientName},</p>
              <p style="font-size: 14px; color: #555;">Your appointment with <strong>${doctorName}</strong> has been completed.</p>
              ${completion_remarks ? `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="font-size: 12px; color: #888; margin: 0 0 8px;">Doctor's Notes:</p>
                  <p style="font-size: 14px; color: #1a1a1a; margin: 0;">${completion_remarks}</p>
                </div>
              ` : ""}
              <p style="font-size: 14px; color: #555; margin-top: 20px;">We'd love to hear about your experience! Your feedback helps us improve.</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${properFeedbackUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Share Your Feedback
                </a>
              </div>
              <p style="font-size: 12px; color: #999; text-align: center;">This link expires in 7 days.</p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: "Mediimate <noreply@mediimate.com>",
          to: [patientEmail],
          subject: `Your appointment with ${doctorName} is complete — Share feedback`,
          html,
        });

        console.log("Completion email sent to:", patientEmail);
      }
    }

    return new Response(JSON.stringify({ success: true, feedback_token: feedbackReq.token }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
