/**
 * WhatsApp Business API integration for Mediimate.
 * Supports OTP, welcome messages, engagement triggers, and case updates.
 *
 * Requires env vars:
 *   WHATSAPP_API_URL    – e.g. https://graph.facebook.com/v18.0/<PHONE_NUMBER_ID>
 *   WHATSAPP_API_TOKEN  – Bearer token for the WhatsApp Business API
 */

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";

function isConfigured(): boolean {
  return !!(WHATSAPP_API_URL && WHATSAPP_API_TOKEN);
}

async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: unknown[],
): Promise<boolean> {
  if (!isConfigured()) {
    console.log(`[whatsapp] Not configured — would send template "${templateName}" to ${to}`);
    return false;
  }

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/[^0-9]/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components ? { components } : {}),
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[whatsapp] Template "${templateName}" to ${to} failed:`, res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[whatsapp] Error sending template "${templateName}":`, err);
    return false;
  }
}

async function sendText(to: string, body: string): Promise<boolean> {
  if (!isConfigured()) {
    console.log(`[whatsapp] Not configured — would send text to ${to}: ${body.slice(0, 80)}...`);
    return false;
  }

  try {
    const res = await fetch(`${WHATSAPP_API_URL}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/[^0-9]/g, ""),
        type: "text",
        text: { body },
      }),
    });

    if (!res.ok) {
      console.error(`[whatsapp] Text to ${to} failed:`, res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[whatsapp] Error sending text:`, err);
    return false;
  }
}

export async function sendOTP(phone: string, code: string): Promise<boolean> {
  return sendTemplate(phone, "mediimate_otp", "en", [
    {
      type: "body",
      parameters: [{ type: "text", text: code }],
    },
  ]);
}

export async function sendWelcome(phone: string, patientName: string): Promise<boolean> {
  return sendText(
    phone,
    `Welcome to Mediimate, ${patientName}! 🏥\n\nYour account is ready. You can now:\n• Search hospitals\n• Submit treatment requests\n• Track your care journey\n\nWe're here to help you every step of the way.`,
  );
}

export async function sendEngagement(
  phone: string,
  templateId: string,
  data: Record<string, string>,
): Promise<boolean> {
  const params = Object.values(data).map((val) => ({ type: "text" as const, text: val }));
  return sendTemplate(phone, templateId, "en", [
    { type: "body", parameters: params },
  ]);
}

export async function sendCaseUpdate(
  phone: string,
  patientName: string,
  caseStatus: string,
  details: string,
): Promise<boolean> {
  const statusLabels: Record<string, string> = {
    hospital_matched: "Hospital Matched",
    hospital_accepted: "Hospital Accepted",
    treatment_scheduled: "Treatment Scheduled",
    treatment_in_progress: "Treatment In Progress",
    treatment_completed: "Treatment Completed",
  };

  const label = statusLabels[caseStatus] || caseStatus;
  return sendText(
    phone,
    `Hi ${patientName},\n\nYour case status has been updated to: *${label}*\n\n${details}\n\nLog in to Mediimate for full details.`,
  );
}

export const whatsapp = {
  isConfigured,
  sendOTP,
  sendWelcome,
  sendEngagement,
  sendCaseUpdate,
  sendTemplate,
  sendText,
};
