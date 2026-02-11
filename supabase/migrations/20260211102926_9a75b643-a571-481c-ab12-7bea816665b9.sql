-- Allow clinic members to view feedbacks for their clinic
CREATE POLICY "Clinic members can view clinic feedbacks"
ON public.feedbacks
FOR SELECT
USING (
  clinic_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_members.clinic_id = feedbacks.clinic_id
    AND clinic_members.user_id = auth.uid()
  )
);