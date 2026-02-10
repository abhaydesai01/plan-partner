
-- Allow authenticated users to look up profiles by doctor_code (needed for link requests)
CREATE POLICY "Anyone can look up doctor by code"
  ON public.profiles
  FOR SELECT
  USING (doctor_code IS NOT NULL);
