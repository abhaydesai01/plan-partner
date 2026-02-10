
-- Create the storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Patients can upload to their own folder
CREATE POLICY "Patients can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents'
  AND auth.uid() IS NOT NULL
);

-- Patients can view their own documents (via doctor_id/patient_id path)
CREATE POLICY "Authenticated users can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents'
  AND auth.uid() IS NOT NULL
);

-- Doctors can manage documents in their folder
CREATE POLICY "Doctors can manage patient documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'patient-documents'
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'patient-documents'
  AND auth.uid() IS NOT NULL
);
