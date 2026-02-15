import mongoose from "mongoose";

const toJsonOptions = {
  virtuals: true,
  transform(_: unknown, ret: Record<string, unknown>) {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

// Enums
const clinicRoleEnum = ["owner", "admin", "doctor", "nurse", "staff"];
const appRoleEnum = ["doctor", "patient", "clinic", "family"];

const AuthUserSchema = new mongoose.Schema(
  {
    clinic_id: String,
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    user_id: { type: String, required: true, unique: true },
  },
  { timestamps: true, toJSON: toJsonOptions }
);

const AlertSchema = new mongoose.Schema(
  {
    alert_type: String,
    description: { type: String, default: "" },
    doctor_id: { type: String, required: true },
    patient_id: { type: String, required: true },
    related_id: String,
    related_type: String,
    resolution_notes: String,
    resolved_at: Date,
    resolved_by: String,
    severity: { type: String, default: "medium" },
    status: { type: String, default: "open" },
    title: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
AlertSchema.index({ doctor_id: 1, created_at: -1 });
AlertSchema.index({ patient_id: 1, created_at: -1 });

const AppointmentCheckinSchema = new mongoose.Schema(
  {
    appointment_id: { type: String, required: true },
    called_at: Date,
    checked_in_at: { type: Date, default: Date.now },
    clinic_id: String,
    completed_at: Date,
    doctor_id: { type: String, required: true },
    estimated_wait_minutes: Number,
    patient_id: { type: String, required: true },
    queue_number: Number,
    status: { type: String, default: "checked_in" },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

const AppointmentSchema = new mongoose.Schema(
  {
    appointment_type: { type: String, default: "consultation" },
    cancellation_reason: String,
    clinic_id: String,
    doctor_id: { type: String, required: true },
    duration_minutes: { type: Number, default: 30 },
    notes: String,
    patient_id: { type: String, required: true },
    rebook_from: String,
    scheduled_at: { type: Date, required: true },
    status: { type: String, default: "scheduled" },
    title: { type: String, required: true },
  },
  { timestamps: true, toJSON: toJsonOptions }
);
AppointmentSchema.index({ doctor_id: 1, scheduled_at: -1 });
AppointmentSchema.index({ patient_id: 1, scheduled_at: -1 });
AppointmentSchema.index({ clinic_id: 1, scheduled_at: -1 });

const ClinicInviteSchema = new mongoose.Schema(
  {
    accepted_at: Date,
    clinic_id: { type: String, required: true },
    email: { type: String, required: true },
    invite_code: { type: String, required: true },
    invited_by: { type: String, required: true },
    role: { type: String, enum: clinicRoleEnum, default: "staff" },
    status: { type: String, default: "pending" },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

const ClinicMemberSchema = new mongoose.Schema(
  {
    clinic_id: { type: String, required: true },
    joined_at: { type: Date, default: Date.now },
    role: { type: String, enum: clinicRoleEnum, required: true },
    user_id: { type: String, required: true },
  },
  { toJSON: toJsonOptions }
);
ClinicMemberSchema.index({ clinic_id: 1, user_id: 1 });
ClinicMemberSchema.index({ user_id: 1 });

const ClinicSchema = new mongoose.Schema(
  {
    address: String,
    bed_count: Number,
    created_by: { type: String, required: true },
    email: String,
    logo_url: String,
    name: { type: String, required: true },
    opd_capacity: Number,
    phone: String,
    specialties: [String],
    whatsapp_number: String,
  },
  { timestamps: true, toJSON: toJsonOptions }
);

const DoctorAvailabilitySchema = new mongoose.Schema(
  {
    appointment_types: { type: [String], default: [] },
    clinic_id: String,
    day_of_week: { type: Number, required: true },
    doctor_id: { type: String, required: true },
    end_time: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    max_patients: Number,
    slot_duration_minutes: { type: Number, default: 15 },
    start_time: { type: String, required: true },
  },
  { timestamps: true, toJSON: toJsonOptions }
);

const EnrollmentSchema = new mongoose.Schema(
  {
    adherence_pct: Number,
    completed_at: Date,
    doctor_id: { type: String, required: true },
    enrolled_at: { type: Date, default: Date.now },
    patient_id: { type: String, required: true },
    program_id: { type: String, required: true },
    status: { type: String, default: "active" },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
EnrollmentSchema.index({ doctor_id: 1, enrolled_at: -1 });
EnrollmentSchema.index({ patient_id: 1, enrolled_at: -1 });

const FeedbackRequestSchema = new mongoose.Schema(
  {
    appointment_id: { type: String, required: true },
    clinic_id: String,
    completion_remarks: String,
    doctor_id: { type: String, required: true },
    expires_at: { type: Date, required: true },
    patient_id: { type: String, required: true },
    patient_user_id: String, // for listing "my requests" by logged-in patient
    status: { type: String, default: "pending" },
    submitted_at: Date,
    token: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

const FeedbackSchema = new mongoose.Schema(
  {
    appointment_id: { type: String, required: true },
    clinic_id: String,
    clinic_rating: Number,
    consent_to_publish: { type: Boolean, default: false },
    doctor_id: { type: String, required: true },
    doctor_rating: Number,
    feedback_request_id: { type: String, required: true },
    is_testimonial: { type: Boolean, default: false },
    patient_id: { type: String, required: true },
    review_text: String,
    video_url: String,
    video_path: String, // uploaded video file (stored in uploads/feedback_videos)
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

const FollowUpSuggestionSchema = new mongoose.Schema(
  {
    appointment_id: { type: String, required: true },
    booked_appointment_id: String,
    doctor_id: { type: String, required: true },
    patient_id: { type: String, required: true },
    reason: String,
    status: { type: String, default: "pending" },
    suggested_date: Date,
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

const FoodLogSchema = new mongoose.Schema(
  {
    doctor_id: { type: String, required: true },
    food_items: mongoose.Schema.Types.Mixed,
    image_path: String,
    logged_at: { type: Date, default: Date.now },
    meal_type: { type: String, default: "other" },
    notes: String,
    patient_id: { type: String, required: true },
    raw_message: String,
    source: { type: String, default: "manual" },
    total_calories: Number,
    total_carbs: Number,
    total_fat: Number,
    total_protein: Number,
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
FoodLogSchema.index({ patient_id: 1, logged_at: -1 });
FoodLogSchema.index({ doctor_id: 1, logged_at: -1 });

const LabResultSchema = new mongoose.Schema(
  {
    doctor_id: { type: String, required: true },
    lab_report_id: { type: mongoose.Schema.Types.ObjectId, ref: "LabReport", default: null },
    notes: String,
    patient_id: { type: String, required: true },
    reference_range: String,
    result_value: { type: String, required: true },
    status: { type: String, default: "final" },
    test_name: { type: String, required: true },
    tested_at: { type: Date, required: true },
    unit: String,
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
LabResultSchema.index({ patient_id: 1, tested_at: -1 });
LabResultSchema.index({ doctor_id: 1, tested_at: -1 });
LabResultSchema.index({ lab_report_id: 1 });

const LabReportSchema = new mongoose.Schema(
  {
    doctor_id: { type: String, required: true },
    patient_id: { type: String, required: true },
    uploaded_by: { type: String, required: true },
    file_name: String,
    file_path: { type: String, required: true },
    file_type: String,
    tested_at: { type: Date, default: Date.now },
    ai_summary: String,
    layman_summary: String,
    extracted_data: mongoose.Schema.Types.Mixed, // { key_points: string[], charts: { title, type, labels, datasets }[] }
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
LabReportSchema.index({ patient_id: 1, tested_at: -1 });

const LinkRequestSchema = new mongoose.Schema(
  {
    doctor_id: { type: String, required: true },
    linked_patient_id: String,
    message: String,
    patient_name: { type: String, required: true },
    patient_user_id: { type: String, required: true },
    resolved_at: Date,
    status: { type: String, default: "pending" },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

const NotificationSchema = new mongoose.Schema(
  {
    category: { type: String, default: "general" },
    is_read: { type: Boolean, default: false },
    message: { type: String, required: true },
    related_id: String,
    related_type: String,
    title: { type: String, required: true },
    type: { type: String, default: "info" },
    user_id: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
NotificationSchema.index({ user_id: 1, created_at: -1 });

const PatientDoctorLinkSchema = new mongoose.Schema(
  {
    doctor_name: String,
    doctor_user_id: { type: String, required: true },
    patient_user_id: { type: String, required: true },
    requested_at: { type: Date, default: Date.now },
    responded_at: Date,
    status: { type: String, required: true, default: "pending" },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
PatientDoctorLinkSchema.index({ doctor_user_id: 1, status: 1 });
PatientDoctorLinkSchema.index({ patient_user_id: 1, status: 1 });

const PatientDocumentSchema = new mongoose.Schema(
  {
    category: { type: String, default: "other" },
    doctor_id: { type: String, required: true },
    file_name: { type: String, required: true },
    file_path: { type: String, required: true },
    file_size_bytes: Number,
    file_type: String,
    notes: String,
    patient_id: { type: String, required: true },
    uploaded_by: { type: String, required: true },
    ai_summary: String,
    layman_summary: String,
    extracted_data: mongoose.Schema.Types.Mixed,
    analyzed_at: Date,
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
PatientDocumentSchema.index({ patient_id: 1, created_at: -1 });
PatientDocumentSchema.index({ doctor_id: 1, created_at: -1 });

const PatientVaultCodeSchema = new mongoose.Schema(
  {
    is_active: { type: Boolean, default: true },
    patient_user_id: { type: String, required: true },
    vault_code: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

const PatientSchema = new mongoose.Schema(
  {
    age: Number,
    clinic_id: String,
    conditions: [String],
    consent_given_at: Date,
    consent_ip: String,
    doctor_id: { type: String, required: true },
    emergency_contact: String,
    full_name: { type: String, required: true },
    gender: String,
    language_preference: String,
    last_check_in: Date,
    medications: [String],
    patient_user_id: String,
    phone: { type: String, required: true, default: "" },
    status: { type: String, default: "active" },
  },
  { timestamps: true, toJSON: toJsonOptions }
);
PatientSchema.index({ doctor_id: 1, full_name: 1 });
PatientSchema.index({ patient_user_id: 1 });
PatientSchema.index({ clinic_id: 1 });

const ProfileSchema = new mongoose.Schema(
  {
    avatar_url: String,
    doctor_code: String,
    full_name: { type: String, default: "" },
    phone: String,
    specialties: [String],
    user_id: { type: String, required: true, unique: true },
  },
  { timestamps: true, toJSON: toJsonOptions }
);

const ProgramSchema = new mongoose.Schema(
  {
    description: String,
    doctor_id: { type: String, required: true },
    duration_days: { type: Number, default: 90 },
    is_active: { type: Boolean, default: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
  },
  { timestamps: true, toJSON: toJsonOptions }
);

const UserRoleSchema = new mongoose.Schema(
  {
    clinic_id: String,
    role: { type: String, enum: appRoleEnum, required: true },
    user_id: { type: String, required: true },
  },
  { toJSON: toJsonOptions }
);

const VitalSchema = new mongoose.Schema(
  {
    doctor_id: { type: String, required: true },
    notes: String,
    patient_id: { type: String, required: true },
    recorded_at: { type: Date, default: Date.now },
    source: { type: String, default: "manual" }, // manual | quick_log | whatsapp | auto
    unit: String,
    value_numeric: Number,
    value_text: { type: String, required: true },
    vital_type: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
VitalSchema.index({ patient_id: 1, recorded_at: -1 });
VitalSchema.index({ doctor_id: 1, recorded_at: -1 });
VitalSchema.index({ patient_id: 1, vital_type: 1, recorded_at: -1 });

const MedicationLogSchema = new mongoose.Schema(
  {
    doctor_id: { type: String, required: true },
    patient_id: { type: String, required: true },
    logged_at: { type: Date, default: Date.now },
    source: { type: String, default: "manual" }, // manual | quick_log | whatsapp | auto | push
    taken: { type: Boolean, required: true }, // true = took medication, false = skipped
    time_of_day: String, // morning | afternoon | evening | night
    medication_name: String, // which medication (when using maker-checker by time)
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
MedicationLogSchema.index({ patient_id: 1, logged_at: -1 });

/** Smart reminders (Layer 2/3): adaptive escalation when user ignores reminders. */
const ReminderEscalationSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    patient_id: { type: String, required: true },
    doctor_id: { type: String, required: true },
    trigger_type: { type: String, required: true }, // blood_pressure | blood_sugar | medication
    anchor_date: { type: Date, required: true }, // day 0 (first missed / first reminder)
    day1_sent_at: Date,
    day2_sent_at: Date,
    day3_sent_at: Date,
    day5_sent_at: Date,
    day5_alert_id: String, // Alert created for doctor (notify family)
    resolved_at: Date, // user logged → stop escalating
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
ReminderEscalationSchema.index({ user_id: 1, trigger_type: 1 });
ReminderEscalationSchema.index({ patient_id: 1, trigger_type: 1 });
ReminderEscalationSchema.index({ resolved_at: 1 });

const PushSubscriptionSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    endpoint: { type: String, required: true },
    keys: { type: mongoose.Schema.Types.Mixed, required: true }, // { p256dh, auth }
    user_agent: String,
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
PushSubscriptionSchema.index({ user_id: 1 });
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

const QuickLogTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    user_id: { type: String, required: true }, // patient user_id (who can redeem)
    type: { type: String, required: true }, // blood_pressure | blood_sugar | food | medication
    value_text: String, // for bp/sugar
    meal_type: String, // for food
    taken: Boolean, // for medication
    expires_at: { type: Date, required: true },
    used_at: Date,
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
QuickLogTokenSchema.index({ token: 1 });
QuickLogTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL optional

/** Layer 4 Accountability: family can see patient's daily log status (BP ✓ / missed). */
const FamilyConnectionSchema = new mongoose.Schema(
  {
    patient_user_id: { type: String, required: true },
    family_user_id: { type: String, default: null }, // set when family signs up or accepts
    invite_email: { type: String, default: null }, // when inviting by email before signup
    relationship: { type: String, required: true, enum: ["son", "daughter", "spouse", "other"] },
    status: { type: String, default: "pending", enum: ["pending", "active"] },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
FamilyConnectionSchema.index({ patient_user_id: 1 });
FamilyConnectionSchema.index({ family_user_id: 1 });
FamilyConnectionSchema.index({ invite_email: 1 });

/** Layer 4: Doctor message shown in patient app ("Dr. Sharma requested daily BP logging"). */
const DoctorMessageSchema = new mongoose.Schema(
  {
    doctor_id: { type: String, required: true },
    patient_id: { type: String, required: true }, // Patient _id
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
DoctorMessageSchema.index({ patient_id: 1, created_at: -1 });
DoctorMessageSchema.index({ doctor_id: 1 });

/** Layer 5 Gamification: badge earned by patient (e.g. Heart Guardian for 30 BP logs). */
const UserBadgeSchema = new mongoose.Schema(
  {
    patient_id: { type: String, required: true },
    badge_key: { type: String, required: true }, // bp_30_days | food_30_days | streak_7 | etc.
    earned_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
UserBadgeSchema.index({ patient_id: 1, badge_key: 1 }, { unique: true });
UserBadgeSchema.index({ patient_id: 1, earned_at: -1 });

/** Layer 5: weekly challenge completion (award points once per week per challenge). */
const UserWeeklyChallengeSchema = new mongoose.Schema(
  {
    patient_id: { type: String, required: true },
    challenge_key: { type: String, required: true }, // bp_7_days | full_week_4 | etc.
    week_start: { type: Date, required: true }, // Monday 00:00 UTC
    reward_points_awarded: { type: Number, default: 0 },
    completed_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
UserWeeklyChallengeSchema.index({ patient_id: 1, challenge_key: 1, week_start: 1 }, { unique: true });

/** Layer 7: Milestone rewards (real-world benefits unlocked after N total logs). */
const MilestoneRewardSchema = new mongoose.Schema(
  {
    patient_id: { type: String, required: true },
    milestone_key: { type: String, required: true }, // e.g. "free_consultation", "medicine_discount"
    unlocked_at: { type: Date, default: Date.now },
    claimed: { type: Boolean, default: false },
    claimed_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
MilestoneRewardSchema.index({ patient_id: 1, milestone_key: 1 }, { unique: true });
MilestoneRewardSchema.index({ patient_id: 1, unlocked_at: -1 });

/** Patient medications: persistent list of medications extracted from prescriptions or added manually. */
const MedicationSchema = new mongoose.Schema(
  {
    patient_id: { type: String, required: true },
    doctor_id: { type: String },
    medicine: { type: String, required: true }, // Full name (e.g. "Amlodipine 5mg")
    dosage: String, // e.g. "1 tablet"
    frequency: String, // e.g. "Once a day", "Twice daily"
    duration: String, // e.g. "30 days"
    instructions: String, // e.g. "After meals"
    timing_display: String, // e.g. "Morning", "Night"
    suggested_time: String, // e.g. "08:00"
    food_relation: String, // e.g. "after food"
    timings: [String], // e.g. ["08:00", "20:00"]
    active: { type: Boolean, default: true },
    source: { type: String, default: "manual" }, // manual | prescription
    prescription_document_id: String, // links to PatientDocument if from prescription
    added_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);
MedicationSchema.index({ patient_id: 1, active: 1 });
MedicationSchema.index({ patient_id: 1, added_at: -1 });

/** Persisted gamification state: streak, points, level, etc. Updated on every log action. */
const PatientGamificationSchema = new mongoose.Schema(
  {
    patient_id: { type: String, required: true, unique: true },
    // Streak
    current_streak: { type: Number, default: 0 },
    longest_streak: { type: Number, default: 0 },
    last_log_date: { type: String }, // YYYY-MM-DD of last log
    // Points
    total_points: { type: Number, default: 0 },
    points_bp: { type: Number, default: 0 },
    points_sugar: { type: Number, default: 0 },
    points_food: { type: Number, default: 0 },
    points_medication: { type: Number, default: 0 },
    // Level
    level: { type: Number, default: 1 },
    level_label: { type: String, default: "Beginner" },
    // Health score (today's progress, reset daily)
    health_score: { type: Number, default: 0 },
    health_score_date: { type: String }, // YYYY-MM-DD
    // Counts (for milestones)
    total_logs: { type: Number, default: 0 },
    bp_logs: { type: Number, default: 0 },
    sugar_logs: { type: Number, default: 0 },
    food_logs: { type: Number, default: 0 },
    medication_logs: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, toJSON: toJsonOptions }
);
PatientGamificationSchema.index({ patient_id: 1 }, { unique: true });

export const AuthUser = mongoose.model("AuthUser", AuthUserSchema);
export const Alert = mongoose.model("Alert", AlertSchema);
export const AppointmentCheckin = mongoose.model("AppointmentCheckin", AppointmentCheckinSchema);
export const Appointment = mongoose.model("Appointment", AppointmentSchema);
export const ClinicInvite = mongoose.model("ClinicInvite", ClinicInviteSchema);
export const ClinicMember = mongoose.model("ClinicMember", ClinicMemberSchema);
export const Clinic = mongoose.model("Clinic", ClinicSchema);
export const DoctorAvailability = mongoose.model("DoctorAvailability", DoctorAvailabilitySchema);
export const Enrollment = mongoose.model("Enrollment", EnrollmentSchema);
export const FeedbackRequest = mongoose.model("FeedbackRequest", FeedbackRequestSchema);
export const Feedback = mongoose.model("Feedback", FeedbackSchema);
export const FollowUpSuggestion = mongoose.model("FollowUpSuggestion", FollowUpSuggestionSchema);
export const FoodLog = mongoose.model("FoodLog", FoodLogSchema);
export const LabResult = mongoose.model("LabResult", LabResultSchema);
export const LabReport = mongoose.model("LabReport", LabReportSchema);
export const LinkRequest = mongoose.model("LinkRequest", LinkRequestSchema);
export const Notification = mongoose.model("Notification", NotificationSchema);
export const PatientDoctorLink = mongoose.model("PatientDoctorLink", PatientDoctorLinkSchema);
export const PatientDocument = mongoose.model("PatientDocument", PatientDocumentSchema);
export const PatientVaultCode = mongoose.model("PatientVaultCode", PatientVaultCodeSchema);
export const Patient = mongoose.model("Patient", PatientSchema);
export const Profile = mongoose.model("Profile", ProfileSchema);
export const Program = mongoose.model("Program", ProgramSchema);
export const UserRole = mongoose.model("UserRole", UserRoleSchema);
export const Vital = mongoose.model("Vital", VitalSchema);
export const MedicationLog = mongoose.model("MedicationLog", MedicationLogSchema);
export const ReminderEscalation = mongoose.model("ReminderEscalation", ReminderEscalationSchema);
export const PushSubscription = mongoose.model("PushSubscription", PushSubscriptionSchema);
export const QuickLogToken = mongoose.model("QuickLogToken", QuickLogTokenSchema);
export const FamilyConnection = mongoose.model("FamilyConnection", FamilyConnectionSchema);
export const DoctorMessage = mongoose.model("DoctorMessage", DoctorMessageSchema);
export const UserBadge = mongoose.model("UserBadge", UserBadgeSchema);
export const UserWeeklyChallenge = mongoose.model("UserWeeklyChallenge", UserWeeklyChallengeSchema);
export const MilestoneReward = mongoose.model("MilestoneReward", MilestoneRewardSchema);
export const Medication = mongoose.model("Medication", MedicationSchema);
export const PatientGamification = mongoose.model("PatientGamification", PatientGamificationSchema);
