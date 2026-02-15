/**
 * Production scalability limits. Use these for all list/pagination endpoints
 * to support ~10k+ patients without unbounded queries.
 */
export const LIMITS = {
  /** Default page size when client does not send limit */
  DEFAULT_PAGE_SIZE: 50,
  /** Maximum allowed limit per request */
  MAX_PAGE_SIZE: 200,
  /** Patient list: default and max */
  PATIENTS_DEFAULT: 50,
  PATIENTS_MAX: 200,
  /** Vitals, labs, documents, etc. per patient/doctor */
  VITALS_MAX: 500,
  LAB_RESULTS_MAX: 500,
  LAB_REPORTS_MAX: 100,
  DOCUMENTS_MAX: 200,
  ALERTS_MAX: 500,
  APPOINTMENTS_MAX: 500,
  APPOINTMENT_CHECKINS_MAX: 500,
  ENROLLMENTS_MAX: 200,
  FEEDBACK_REQUESTS_MAX: 200,
  FEEDBACKS_MAX: 500,
  FOOD_LOGS_MAX: 500,
  LINK_REQUESTS_MAX: 200,
  NOTIFICATIONS_MAX: 200,
  MEDICATION_LOGS_MAX: 100,
  /** Internal/cron: push subscriptions batch (iterate in chunks) */
  PUSH_SUBSCRIPTION_BATCH: 5000,
  /** Me (patient) endpoints: keep smaller for mobile */
  ME_DOCUMENTS_MAX: 100,
  ME_VITALS_MAX: 100,
  ME_LAB_RESULTS_MAX: 100,
  ME_FOOD_LOGS_MAX: 100,
  ME_MEDICATION_LOGS_MAX: 50,
  ME_LINK_REQUESTS_MAX: 20,
} as const;

export function parseLimit(queryLimit: string | undefined, defaultVal: number, maxVal: number): number {
  const parsed = parseInt(String(queryLimit || defaultVal), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultVal;
  return Math.min(parsed, maxVal);
}

export function parseSkip(querySkip: string | undefined): number {
  const parsed = parseInt(String(querySkip || "0"), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
