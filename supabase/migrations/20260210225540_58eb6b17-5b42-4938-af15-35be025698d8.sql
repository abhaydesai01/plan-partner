
-- Patient vault codes: each patient gets a unique shareable code
CREATE TABLE public.patient_vault_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL UNIQUE,
  vault_code text NOT NULL UNIQUE DEFAULT UPPER(SUBSTR(MD5(gen_random_uuid()::text || NOW()::text), 1, 8)),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.patient_vault_codes ENABLE ROW LEVEL SECURITY;

-- Patients can view/manage their own vault code
CREATE POLICY "Patients can view own vault code"
  ON public.patient_vault_codes FOR SELECT
  USING (auth.uid() = patient_user_id);

CREATE POLICY "Patients can insert own vault code"
  ON public.patient_vault_codes FOR INSERT
  WITH CHECK (auth.uid() = patient_user_id);

CREATE POLICY "Patients can update own vault code"
  ON public.patient_vault_codes FOR UPDATE
  USING (auth.uid() = patient_user_id);

-- Doctors can look up vault codes (to verify code exists when linking)
CREATE POLICY "Doctors can look up vault codes"
  ON public.patient_vault_codes FOR SELECT
  USING (public.has_role(auth.uid(), 'doctor') AND is_active = true);

-- Patient-Doctor links: many-to-many with approval
CREATE TABLE public.patient_doctor_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL,
  doctor_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  doctor_name text,
  UNIQUE(patient_user_id, doctor_user_id)
);

ALTER TABLE public.patient_doctor_links ENABLE ROW LEVEL SECURITY;

-- Patients can view and manage their links
CREATE POLICY "Patients can view own links"
  ON public.patient_doctor_links FOR SELECT
  USING (auth.uid() = patient_user_id);

CREATE POLICY "Patients can update own links"
  ON public.patient_doctor_links FOR UPDATE
  USING (auth.uid() = patient_user_id);

-- Doctors can view links where they are the doctor
CREATE POLICY "Doctors can view own links"
  ON public.patient_doctor_links FOR SELECT
  USING (auth.uid() = doctor_user_id);

-- Doctors can insert link requests (when they enter a patient's code)
CREATE POLICY "Doctors can request links"
  ON public.patient_doctor_links FOR INSERT
  WITH CHECK (auth.uid() = doctor_user_id);

-- Now update RLS on vitals, lab_results, patient_documents to allow approved linked doctors to read
-- Add policies for linked doctors to view patient data

-- Vitals: linked doctors can view
CREATE POLICY "Linked doctors can view patient vitals"
  ON public.vitals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
      WHERE p.id = vitals.patient_id
        AND pdl.doctor_user_id = auth.uid()
        AND pdl.status = 'approved'
    )
  );

-- Patients can insert own vitals
CREATE POLICY "Patients can insert own vitals"
  ON public.vitals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = vitals.patient_id
        AND patients.patient_user_id = auth.uid()
    )
  );

-- Lab results: linked doctors can view
CREATE POLICY "Linked doctors can view patient lab results"
  ON public.lab_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
      WHERE p.id = lab_results.patient_id
        AND pdl.doctor_user_id = auth.uid()
        AND pdl.status = 'approved'
    )
  );

-- Patients can insert own lab results
CREATE POLICY "Patients can insert own lab results"
  ON public.lab_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = lab_results.patient_id
        AND patients.patient_user_id = auth.uid()
    )
  );

-- Documents: linked doctors can view
CREATE POLICY "Linked doctors can view patient documents"
  ON public.patient_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
      WHERE p.id = patient_documents.patient_id
        AND pdl.doctor_user_id = auth.uid()
        AND pdl.status = 'approved'
    )
  );

-- Appointments: linked doctors can view
CREATE POLICY "Linked doctors can view patient appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      JOIN public.patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
      WHERE p.id = appointments.patient_id
        AND pdl.doctor_user_id = auth.uid()
        AND pdl.status = 'approved'
    )
  );
