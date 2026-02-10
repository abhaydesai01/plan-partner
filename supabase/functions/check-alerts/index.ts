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

    const now = new Date();
    const alerts: Array<{
      doctor_id: string;
      patient_id: string;
      alert_type: string;
      severity: string;
      title: string;
      description: string;
      related_id: string;
      related_type: string;
    }> = [];

    // 1. LOW ADHERENCE — active enrollments with adherence < 50%
    const { data: lowAdherenceEnrollments } = await supabase
      .from("enrollments")
      .select("id, doctor_id, patient_id, adherence_pct, patients(full_name), programs(name)")
      .eq("status", "active")
      .lt("adherence_pct", 50);

    if (lowAdherenceEnrollments) {
      for (const e of lowAdherenceEnrollments) {
        const patientName = (e.patients as any)?.full_name || "Patient";
        const programName = (e.programs as any)?.name || "Program";
        const adherence = e.adherence_pct ?? 0;
        const severity = adherence < 25 ? "critical" : "warning";

        // Check if an open alert already exists for this enrollment
        const { data: existing } = await supabase
          .from("alerts")
          .select("id")
          .eq("doctor_id", e.doctor_id)
          .eq("related_id", e.id)
          .eq("related_type", "enrollment")
          .eq("alert_type", "low_adherence")
          .in("status", ["open", "acknowledged"])
          .limit(1);

        if (!existing || existing.length === 0) {
          alerts.push({
            doctor_id: e.doctor_id,
            patient_id: e.patient_id,
            alert_type: "low_adherence",
            severity,
            title: `Low adherence: ${patientName}`,
            description: `${patientName} has ${adherence}% adherence in "${programName}". Immediate follow-up recommended.`,
            related_id: e.id,
            related_type: "enrollment",
          });
        }
      }
    }

    // 2. ABNORMAL VITALS — vitals recorded in last 24h with abnormal status
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: abnormalVitals } = await supabase
      .from("vitals")
      .select("id, doctor_id, patient_id, vital_type, value_text, value_numeric, unit, patients(full_name)")
      .gte("recorded_at", oneDayAgo);

    if (abnormalVitals) {
      for (const v of abnormalVitals) {
        const val = v.value_numeric;
        if (val === null) continue;

        let isAbnormal = false;
        let severityLevel = "warning";
        let detail = "";

        const type = v.vital_type?.toLowerCase() || "";

        // Blood pressure systolic
        if (type.includes("blood_pressure") || type.includes("bp_systolic") || type.includes("systolic")) {
          if (val >= 180 || val <= 70) {
            isAbnormal = true;
            severityLevel = "critical";
            detail = `Systolic BP: ${val} ${v.unit || "mmHg"}`;
          } else if (val >= 140 || val <= 90) {
            isAbnormal = true;
            detail = `Systolic BP: ${val} ${v.unit || "mmHg"}`;
          }
        }
        // Heart rate
        else if (type.includes("heart_rate") || type.includes("pulse")) {
          if (val > 120 || val < 50) {
            isAbnormal = true;
            severityLevel = "critical";
            detail = `Heart rate: ${val} ${v.unit || "bpm"}`;
          } else if (val > 100 || val < 60) {
            isAbnormal = true;
            detail = `Heart rate: ${val} ${v.unit || "bpm"}`;
          }
        }
        // Blood sugar / glucose
        else if (type.includes("glucose") || type.includes("blood_sugar") || type.includes("sugar")) {
          if (val > 300 || val < 54) {
            isAbnormal = true;
            severityLevel = "critical";
            detail = `Blood sugar: ${val} ${v.unit || "mg/dL"}`;
          } else if (val > 200 || val < 70) {
            isAbnormal = true;
            detail = `Blood sugar: ${val} ${v.unit || "mg/dL"}`;
          }
        }
        // Temperature
        else if (type.includes("temperature") || type.includes("temp")) {
          if (val > 103 || val < 95) {
            isAbnormal = true;
            severityLevel = "critical";
            detail = `Temperature: ${val} ${v.unit || "°F"}`;
          } else if (val > 100.4 || val < 96.8) {
            isAbnormal = true;
            detail = `Temperature: ${val} ${v.unit || "°F"}`;
          }
        }
        // SpO2
        else if (type.includes("spo2") || type.includes("oxygen")) {
          if (val < 90) {
            isAbnormal = true;
            severityLevel = "critical";
            detail = `SpO2: ${val}%`;
          } else if (val < 94) {
            isAbnormal = true;
            detail = `SpO2: ${val}%`;
          }
        }

        if (isAbnormal) {
          const { data: existing } = await supabase
            .from("alerts")
            .select("id")
            .eq("related_id", v.id)
            .eq("related_type", "vital")
            .eq("alert_type", "abnormal_vital")
            .in("status", ["open", "acknowledged"])
            .limit(1);

          if (!existing || existing.length === 0) {
            const patientName = (v.patients as any)?.full_name || "Patient";
            alerts.push({
              doctor_id: v.doctor_id,
              patient_id: v.patient_id,
              alert_type: "abnormal_vital",
              severity: severityLevel,
              title: `Abnormal vital: ${patientName}`,
              description: `${detail} recorded for ${patientName}. Review immediately.`,
              related_id: v.id,
              related_type: "vital",
            });
          }
        }
      }
    }

    // 3. NO-SHOWS — scheduled appointments that are past and still "scheduled"
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const { data: noShowAppts } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id, title, scheduled_at, patients(full_name)")
      .eq("status", "scheduled")
      .lt("scheduled_at", twoHoursAgo);

    if (noShowAppts) {
      for (const a of noShowAppts) {
        const { data: existing } = await supabase
          .from("alerts")
          .select("id")
          .eq("related_id", a.id)
          .eq("related_type", "appointment")
          .eq("alert_type", "no_show")
          .in("status", ["open", "acknowledged"])
          .limit(1);

        if (!existing || existing.length === 0) {
          const patientName = (a.patients as any)?.full_name || "Patient";
          alerts.push({
            doctor_id: a.doctor_id,
            patient_id: a.patient_id,
            alert_type: "no_show",
            severity: "warning",
            title: `No-show: ${patientName}`,
            description: `${patientName} missed appointment "${a.title}" scheduled for ${new Date(a.scheduled_at).toLocaleString()}.`,
            related_id: a.id,
            related_type: "appointment",
          });
        }
      }
    }

    // Insert all new alerts
    let insertedCount = 0;
    if (alerts.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("alerts")
        .insert(alerts)
        .select("id, doctor_id, title");

      if (insertError) {
        console.error("Insert error:", insertError);
      } else {
        insertedCount = inserted?.length || 0;

        // Also create notifications for each alert
        const notifications = (inserted || []).map((a) => ({
          user_id: a.doctor_id,
          title: a.title,
          message: alerts.find((al) => al.title === a.title)?.description || "",
          type: "alert",
          category: "alert",
          related_id: a.id,
          related_type: "alert",
        }));

        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: insertedCount,
        scanned: {
          low_adherence: lowAdherenceEnrollments?.length || 0,
          vitals_checked: abnormalVitals?.length || 0,
          potential_no_shows: noShowAppts?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-alerts error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
