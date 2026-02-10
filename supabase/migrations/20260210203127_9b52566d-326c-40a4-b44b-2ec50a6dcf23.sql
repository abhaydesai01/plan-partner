
-- 1. User roles system
CREATE TYPE public.app_role AS ENUM ('doctor', 'patient');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-assign doctor role on signup (existing users are doctors)
-- We'll handle patient role assignment separately

-- 2. Link patients to auth users (optional patient_user_id)
ALTER TABLE public.patients ADD COLUMN patient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow patients to view their own record
CREATE POLICY "Patients can view own record"
  ON public.patients FOR SELECT
  USING (auth.uid() = patient_user_id);

-- 3. Vitals tracking
CREATE TABLE public.vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  vital_type text NOT NULL, -- blood_pressure, heart_rate, temperature, weight, blood_sugar, spo2
  value_text text NOT NULL, -- e.g. "120/80", "72", "98.6"
  value_numeric numeric, -- for charting
  unit text, -- mmHg, bpm, °F, kg, mg/dL, %
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage own vitals"
  ON public.vitals FOR ALL
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Patients can view own vitals"
  ON public.vitals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = vitals.patient_id
      AND patients.patient_user_id = auth.uid()
    )
  );

-- 4. Lab results
CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  test_name text NOT NULL,
  result_value text NOT NULL,
  reference_range text,
  unit text,
  status text NOT NULL DEFAULT 'normal', -- normal, abnormal, critical
  tested_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage own lab results"
  ON public.lab_results FOR ALL
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Patients can view own lab results"
  ON public.lab_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = lab_results.patient_id
      AND patients.patient_user_id = auth.uid()
    )
  );

-- 5. Patient documents
CREATE TABLE public.patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  uploaded_by uuid NOT NULL, -- could be doctor or patient
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text, -- pdf, image, etc.
  file_size_bytes bigint,
  category text NOT NULL DEFAULT 'general', -- general, lab, prescription, imaging, insurance
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage own documents"
  ON public.patient_documents FOR ALL
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Patients can view own documents"
  ON public.patient_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_documents.patient_id
      AND patients.patient_user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can upload own documents"
  ON public.patient_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_documents.patient_id
      AND patients.patient_user_id = auth.uid()
    )
  );

-- 6. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- info, warning, alert, success
  category text NOT NULL DEFAULT 'general', -- appointment, enrollment, compliance, system
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid, -- optional link to patient/enrollment/appointment
  related_type text, -- patient, enrollment, appointment
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 7. Storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-documents', 'patient-documents', false);

CREATE POLICY "Doctors can upload patient documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Doctors can view patient documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Doctors can delete patient documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow patients to view documents in their patient folder
CREATE POLICY "Patients can view own storage documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'patient-documents' AND
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.patient_user_id = auth.uid()
      AND patients.doctor_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Patients can upload own storage documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-documents' AND
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.patient_user_id = auth.uid()
    )
  );

-- 8. Allow patients to view their own enrollments and appointments
CREATE POLICY "Patients can view own enrollments"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = enrollments.patient_id
      AND patients.patient_user_id = auth.uid()
    )
  );

CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = appointments.patient_id
      AND patients.patient_user_id = auth.uid()
    )
  );

-- 9. Assign doctor role to all existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'doctor'::app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- 10. Trigger to auto-assign doctor role on signup (default)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'doctor'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();
