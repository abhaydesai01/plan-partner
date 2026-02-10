
-- Allow patients to create their own patient record (self-registration)
CREATE POLICY "Patients can create own record"
  ON public.patients FOR INSERT
  WITH CHECK (auth.uid() = patient_user_id);
