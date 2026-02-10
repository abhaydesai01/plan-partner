
-- Table for patient link requests
CREATE TABLE public.link_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  patient_name TEXT NOT NULL,
  doctor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  linked_patient_id UUID REFERENCES public.patients(id),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own requests
CREATE POLICY "Patients can create link requests"
  ON public.link_requests FOR INSERT
  WITH CHECK (auth.uid() = patient_user_id);

-- Patients can view their own requests
CREATE POLICY "Patients can view own link requests"
  ON public.link_requests FOR SELECT
  USING (auth.uid() = patient_user_id);

-- Doctors can view requests addressed to them
CREATE POLICY "Doctors can view their link requests"
  ON public.link_requests FOR SELECT
  USING (auth.uid() = doctor_id);

-- Doctors can update (approve/deny) requests addressed to them
CREATE POLICY "Doctors can update their link requests"
  ON public.link_requests FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Add a unique doctor code column to profiles for easy lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS doctor_code TEXT UNIQUE;

-- Generate doctor codes for existing profiles
UPDATE public.profiles
SET doctor_code = UPPER(SUBSTR(MD5(user_id::text || created_at::text), 1, 6))
WHERE doctor_code IS NULL;

-- Function to auto-generate doctor code on profile creation
CREATE OR REPLACE FUNCTION public.generate_doctor_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.doctor_code IS NULL THEN
    NEW.doctor_code := UPPER(SUBSTR(MD5(NEW.user_id::text || NOW()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_doctor_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_doctor_code();
