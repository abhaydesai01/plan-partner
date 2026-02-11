
-- Add appointment_type to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'in_person',
ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id),
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS rebook_from uuid REFERENCES public.appointments(id);

-- Doctor availability slots
CREATE TABLE public.doctor_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL,
  clinic_id uuid REFERENCES public.clinics(id),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 30,
  appointment_types text[] NOT NULL DEFAULT '{in_person}',
  is_active boolean NOT NULL DEFAULT true,
  max_patients integer DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage own availability"
ON public.doctor_availability FOR ALL
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Patients can view active availability of linked doctors"
ON public.doctor_availability FOR SELECT
USING (
  is_active = true AND (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.doctor_id = doctor_availability.doctor_id
        AND p.patient_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM patient_doctor_links pdl
      WHERE pdl.doctor_user_id = doctor_availability.doctor_id
        AND pdl.patient_user_id = auth.uid()
        AND pdl.status = 'approved'
    )
  )
);

-- Appointment check-ins (QR check-in, queue)
CREATE TABLE public.appointment_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  doctor_id uuid NOT NULL,
  clinic_id uuid REFERENCES public.clinics(id),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  queue_number integer,
  status text NOT NULL DEFAULT 'waiting',
  called_at timestamptz,
  completed_at timestamptz,
  estimated_wait_minutes integer
);

ALTER TABLE public.appointment_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage checkins"
ON public.appointment_checkins FOR ALL
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Patients can view own checkins"
ON public.appointment_checkins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = appointment_checkins.patient_id
      AND patients.patient_user_id = auth.uid()
  )
);

CREATE POLICY "Patients can create own checkins"
ON public.appointment_checkins FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = appointment_checkins.patient_id
      AND patients.patient_user_id = auth.uid()
  )
);

-- Post-visit follow-ups
CREATE TABLE public.follow_up_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  doctor_id uuid NOT NULL,
  suggested_date date,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  booked_appointment_id uuid REFERENCES public.appointments(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage follow-ups"
ON public.follow_up_suggestions FOR ALL
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Patients can view own follow-ups"
ON public.follow_up_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = follow_up_suggestions.patient_id
      AND patients.patient_user_id = auth.uid()
  )
);

-- Trigger for updated_at on doctor_availability
CREATE TRIGGER update_doctor_availability_updated_at
BEFORE UPDATE ON public.doctor_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for checkins (live queue)
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_checkins;
