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
const appRoleEnum = ["doctor", "patient"];

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

const FeedbackRequestSchema = new mongoose.Schema(
  {
    appointment_id: { type: String, required: true },
    clinic_id: String,
    completion_remarks: String,
    doctor_id: { type: String, required: true },
    expires_at: { type: Date, required: true },
    patient_id: { type: String, required: true },
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

const LabResultSchema = new mongoose.Schema(
  {
    doctor_id: { type: String, required: true },
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

const PatientDoctorLinkSchema = new mongoose.Schema(
  {
    doctor_name: String,
    doctor_user_id: { type: String, required: true },
    patient_user_id: { type: String, required: true },
    requested_at: { type: Date, default: Date.now },
    responded_at: Date,
    status: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

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
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

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
    unit: String,
    value_numeric: Number,
    value_text: { type: String, required: true },
    vital_type: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at" }, toJSON: toJsonOptions }
);

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
