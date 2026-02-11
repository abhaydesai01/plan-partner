
-- Feedback requests: created when doctor completes an appointment
CREATE TABLE public.feedback_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  clinic_id uuid REFERENCES public.clinics(id),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  completion_remarks text,
  status text NOT NULL DEFAULT 'pending', -- pending, submitted, expired
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE UNIQUE INDEX idx_feedback_requests_token ON public.feedback_requests(token);
CREATE INDEX idx_feedback_requests_appointment ON public.feedback_requests(appointment_id);

ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own feedback requests
CREATE POLICY "Doctors can manage own feedback requests"
ON public.feedback_requests FOR ALL
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- Patients can view own feedback requests
CREATE POLICY "Patients can view own feedback requests"
ON public.feedback_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patients WHERE patients.id = feedback_requests.patient_id AND patients.patient_user_id = auth.uid()
));

-- Public access by token (for unauthenticated feedback submission)
CREATE POLICY "Anyone can view by token"
ON public.feedback_requests FOR SELECT
USING (true);

-- Feedbacks table: actual feedback submitted
CREATE TABLE public.feedbacks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_request_id uuid NOT NULL REFERENCES public.feedback_requests(id),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  clinic_id uuid REFERENCES public.clinics(id),
  doctor_rating integer CHECK (doctor_rating >= 1 AND doctor_rating <= 5),
  clinic_rating integer CHECK (clinic_rating >= 1 AND clinic_rating <= 5),
  review_text text,
  video_url text,
  is_testimonial boolean NOT NULL DEFAULT false,
  consent_to_publish boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Doctors can view feedbacks for their appointments
CREATE POLICY "Doctors can view own feedbacks"
ON public.feedbacks FOR SELECT
USING (auth.uid() = doctor_id);

-- Allow anonymous insert (public feedback page uses token)
CREATE POLICY "Anyone can insert feedback"
ON public.feedbacks FOR INSERT
WITH CHECK (true);

-- Patients can view own feedbacks
CREATE POLICY "Patients can view own feedbacks"
ON public.feedbacks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patients WHERE patients.id = feedbacks.patient_id AND patients.patient_user_id = auth.uid()
));

-- Storage bucket for feedback videos
INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-videos', 'feedback-videos', true);

CREATE POLICY "Anyone can upload feedback videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'feedback-videos');

CREATE POLICY "Anyone can view feedback videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-videos');
