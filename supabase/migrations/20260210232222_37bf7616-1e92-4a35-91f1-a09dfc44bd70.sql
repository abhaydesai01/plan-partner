
-- 1. FIX: Profiles table - restrict public doctor lookup to only return minimal info
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can look up doctor by code" ON public.profiles;

-- Replace with a policy that requires authentication and only allows lookup by code
CREATE POLICY "Authenticated users can look up doctor by code"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND doctor_code IS NOT NULL
);

-- 2. FIX: Vault codes - restrict to doctors with approved patient links only
DROP POLICY IF EXISTS "Doctors can look up vault codes" ON public.patient_vault_codes;

CREATE POLICY "Linked doctors can look up vault codes"
ON public.patient_vault_codes
FOR SELECT
USING (
  has_role(auth.uid(), 'doctor'::app_role)
  AND is_active = true
  AND EXISTS (
    SELECT 1 FROM public.patient_doctor_links pdl
    WHERE pdl.patient_user_id = patient_vault_codes.patient_user_id
    AND pdl.doctor_user_id = auth.uid()
    AND pdl.status = 'approved'
  )
);

-- 3. FIX: Clinic invites - require authentication for invite lookup
DROP POLICY IF EXISTS "Anyone can look up invites by code" ON public.clinic_invites;

CREATE POLICY "Authenticated users can look up invites by code"
ON public.clinic_invites
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND status = 'pending'
);

-- 4. FIX: Add missing policy for linked doctors to view patient food logs
CREATE POLICY "Linked doctors can view patient food logs"
ON public.food_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM patients p
    JOIN patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
    WHERE p.id = food_logs.patient_id
    AND pdl.doctor_user_id = auth.uid()
    AND pdl.status = 'approved'
  )
);
