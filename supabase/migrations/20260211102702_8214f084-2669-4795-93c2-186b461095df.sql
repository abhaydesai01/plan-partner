-- Allow anyone to read published feedbacks (consent_to_publish = true) for the landing page
CREATE POLICY "Anyone can view published feedbacks"
ON public.feedbacks
FOR SELECT
USING (consent_to_publish = true);