
-- Fix overly permissive INSERT policy on notifications
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only authenticated users can insert notifications for themselves or system can via service role
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
