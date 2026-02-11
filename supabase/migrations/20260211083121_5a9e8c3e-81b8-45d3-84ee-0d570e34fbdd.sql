
-- Add SELECT policy for clinic creators to read their own clinics
CREATE POLICY "Creators can view own clinics"
ON public.clinics
FOR SELECT
USING (auth.uid() = created_by);
