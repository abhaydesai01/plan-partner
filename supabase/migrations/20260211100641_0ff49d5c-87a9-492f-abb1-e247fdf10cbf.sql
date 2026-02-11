-- Allow patients to book appointments (insert) for themselves
CREATE POLICY "Patients can book own appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = appointments.patient_id
    AND patients.patient_user_id = auth.uid()
  )
);

-- Allow patients to cancel their own appointments (update status)
CREATE POLICY "Patients can update own appointments"
ON public.appointments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = appointments.patient_id
    AND patients.patient_user_id = auth.uid()
  )
);