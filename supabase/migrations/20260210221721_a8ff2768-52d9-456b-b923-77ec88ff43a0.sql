
-- Create food_logs table for tracking patient food intake via WhatsApp
CREATE TABLE public.food_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  meal_type TEXT NOT NULL DEFAULT 'other', -- breakfast, lunch, dinner, snack, other
  food_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, quantity, unit, calories, protein, carbs, fat}]
  raw_message TEXT, -- original WhatsApp message
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp, manual
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their patients' food logs
CREATE POLICY "Doctors can manage own food logs"
  ON public.food_logs FOR ALL
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

-- Patients can view their own food logs
CREATE POLICY "Patients can view own food logs"
  ON public.food_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = food_logs.patient_id
    AND patients.patient_user_id = auth.uid()
  ));

-- Patients can insert their own food logs
CREATE POLICY "Patients can insert own food logs"
  ON public.food_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = food_logs.patient_id
    AND patients.patient_user_id = auth.uid()
  ));

-- Index for fast lookups
CREATE INDEX idx_food_logs_patient_date ON public.food_logs (patient_id, logged_at DESC);
CREATE INDEX idx_food_logs_doctor ON public.food_logs (doctor_id);
