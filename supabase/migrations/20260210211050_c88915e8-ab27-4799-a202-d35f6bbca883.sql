
-- Create alerts table for the escalation engine
CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- 'missed_medication', 'abnormal_vital', 'no_show', 'low_adherence'
  severity text NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'escalated'
  related_id uuid, -- optional FK to the source record (vital, enrollment, appointment)
  related_type text, -- 'vital', 'enrollment', 'appointment'
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_alerts_doctor_status ON public.alerts(doctor_id, status);
CREATE INDEX idx_alerts_patient ON public.alerts(patient_id);
CREATE INDEX idx_alerts_created ON public.alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Doctors can view their own alerts
CREATE POLICY "Doctors can view own alerts"
ON public.alerts FOR SELECT
USING (auth.uid() = doctor_id);

-- Doctors can update their own alerts (acknowledge/resolve)
CREATE POLICY "Doctors can update own alerts"
ON public.alerts FOR UPDATE
USING (auth.uid() = doctor_id);

-- Service role / edge functions insert alerts (no user-level insert needed)
-- But we need insert for edge functions using service role key, which bypasses RLS
-- Also allow doctor to insert (for manual escalations)
CREATE POLICY "Doctors can insert own alerts"
ON public.alerts FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

-- Doctors can delete own alerts
CREATE POLICY "Doctors can delete own alerts"
ON public.alerts FOR DELETE
USING (auth.uid() = doctor_id);

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
