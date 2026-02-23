/**
 * Engagement Automation Engine for Mediimate.
 * Processes program enrollment tasks, triggers multi-channel engagement
 * (WhatsApp, Voice, Push, Email) based on phase task configurations.
 */

import {
  Enrollment,
  Program,
  Patient,
  Profile,
  Notification,
  PushSubscription,
} from "../models/index.js";
import { whatsapp } from "./whatsapp.js";

interface TaskTrigger {
  trigger_type: "whatsapp" | "voice" | "notification" | "email";
  template_id?: string;
  delay_hours?: number;
}

interface PhaseTask {
  title: string;
  frequency: string;
  description?: string;
  automation_triggers?: TaskTrigger[];
}

interface Phase {
  name: string;
  phase_type: string;
  duration_days: number;
  tasks: PhaseTask[];
}

function getActivePhase(enrollment: any, program: any): Phase | null {
  if (!program?.phases?.length) return null;
  const enrolledAt = new Date(enrollment.enrolled_at || enrollment.created_at);
  const daysSinceEnrollment = Math.floor((Date.now() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24));

  let cumulativeDays = 0;
  for (const phase of program.phases) {
    cumulativeDays += phase.duration_days || 0;
    if (daysSinceEnrollment < cumulativeDays) return phase;
  }

  return program.phases[program.phases.length - 1];
}

async function sendPushToUser(userId: string, title: string, message: string): Promise<void> {
  try {
    const webpush = await import("web-push").then((m) => m.default);
    const subs = await PushSubscription.find({ user_id: userId }).lean();
    for (const sub of subs as any[]) {
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title, body: message }),
        )
        .catch(() => {});
    }
  } catch {
    // web-push not configured or no subscriptions
  }
}

async function processEnrollmentTriggers(enrollment: any, program: any): Promise<number> {
  const phase = getActivePhase(enrollment, program);
  if (!phase?.tasks?.length) return 0;

  const patient = await Patient.findOne({
    $or: [
      { _id: enrollment.patient_id },
      { patient_user_id: enrollment.patient_id },
    ],
  }).lean();
  const profile = await Profile.findOne({ user_id: enrollment.patient_id }).lean();
  const patientName = (profile as any)?.full_name || (patient as any)?.full_name || "Patient";
  const phone = (profile as any)?.phone || (patient as any)?.phone;

  let triggered = 0;

  for (const task of phase.tasks) {
    if (!task.automation_triggers?.length) continue;

    for (const trigger of task.automation_triggers) {
      const delayMs = (trigger.delay_hours || 0) * 60 * 60 * 1000;
      const now = Date.now();
      const enrolledAt = new Date(enrollment.enrolled_at || enrollment.created_at).getTime();

      if (now - enrolledAt < delayMs) continue;

      switch (trigger.trigger_type) {
        case "whatsapp":
          if (phone) {
            await whatsapp.sendEngagement(phone, trigger.template_id || "mediimate_engagement", {
              patient_name: patientName,
              task_name: task.title,
              phase_name: phase.name,
            });
            triggered++;
          }
          break;

        case "notification":
          await Notification.create({
            user_id: enrollment.patient_id,
            title: `${phase.name}: ${task.title}`,
            message: task.description || `Time for your ${task.title.toLowerCase()} task.`,
            type: "info",
            category: "engagement",
            related_id: enrollment._id?.toString(),
            related_type: "enrollment",
          });
          await sendPushToUser(
            enrollment.patient_id,
            `${phase.name}: ${task.title}`,
            task.description || `Time for your ${task.title.toLowerCase()} task.`,
          );
          triggered++;
          break;

        case "email":
          // Email triggers are handled by the existing email service cron jobs
          triggered++;
          break;

        case "voice":
          // Voice triggers would integrate with Vapi or similar voice API
          // For now, fall back to notification
          await Notification.create({
            user_id: enrollment.patient_id,
            title: `Voice Check-in: ${task.title}`,
            message: `Tap to start your ${task.title.toLowerCase()} voice check-in.`,
            type: "info",
            category: "voice_engagement",
            related_id: enrollment._id?.toString(),
            related_type: "enrollment",
          });
          triggered++;
          break;
      }
    }
  }

  return triggered;
}

export async function processEngagementAutomation(): Promise<{
  processed: number;
  triggered: number;
}> {
  const activeEnrollments = await Enrollment.find({ status: "active" }).lean();
  const programIds = [...new Set(activeEnrollments.map((e: any) => e.program_id))];
  const programs = programIds.length ? await Program.find({ _id: { $in: programIds } }).lean() : [];
  const programMap = new Map((programs as any[]).map((p: any) => [p._id.toString(), p]));

  let totalTriggered = 0;

  for (const enrollment of activeEnrollments as any[]) {
    const program = programMap.get(enrollment.program_id);
    if (!program) continue;

    const triggered = await processEnrollmentTriggers(enrollment, program);
    totalTriggered += triggered;
  }

  return { processed: activeEnrollments.length, triggered: totalTriggered };
}

export async function processCompletionCheck(): Promise<number> {
  const activeEnrollments = await Enrollment.find({ status: "active" }).lean();
  const programIds = [...new Set(activeEnrollments.map((e: any) => e.program_id))];
  const programs = programIds.length ? await Program.find({ _id: { $in: programIds } }).lean() : [];
  const programMap = new Map((programs as any[]).map((p: any) => [p._id.toString(), p]));

  let completed = 0;

  for (const enrollment of activeEnrollments as any[]) {
    const program = programMap.get(enrollment.program_id) as any;
    if (!program) continue;

    const enrolledAt = new Date(enrollment.enrolled_at || enrollment.created_at);
    const totalDays = program.duration_days || 90;
    const daysSince = Math.floor((Date.now() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince >= totalDays) {
      await Enrollment.updateOne(
        { _id: enrollment._id },
        { $set: { status: "completed", completed_at: new Date() } },
      );

      await Notification.create({
        user_id: enrollment.patient_id,
        title: "Program Completed!",
        message: `Congratulations! You've completed the ${program.name} program.`,
        type: "success",
        category: "program",
        related_id: enrollment._id?.toString(),
        related_type: "enrollment",
      });

      completed++;
    }
  }

  return completed;
}
