
-- Add consent tracking to patients
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS consent_given_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS consent_ip text,
ADD COLUMN IF NOT EXISTS language_preference text DEFAULT 'en';

-- Create edge function for public enrollment (anon insert)
-- We need a policy allowing anon to insert via an edge function
-- The edge function will use service role, so no extra policy needed

-- Allow patients to update their own record (for health profile editing)
-- Already have "Patients can view own record" SELECT policy
-- Need UPDATE policy for patients to edit their own profile fields
CREATE POLICY "Patients can update own record"
ON public.patients FOR UPDATE
USING (auth.uid() = patient_user_id)
WITH CHECK (auth.uid() = patient_user_id);
