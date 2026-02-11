
-- Fix clinics table: change INSERT policy to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create clinics" ON public.clinics;
CREATE POLICY "Authenticated users can create clinics"
ON public.clinics
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Fix clinics SELECT policy to PERMISSIVE
DROP POLICY IF EXISTS "Members can view their clinics" ON public.clinics;
CREATE POLICY "Members can view their clinics"
ON public.clinics
FOR SELECT
USING (is_clinic_member(auth.uid(), id));

-- Fix clinics UPDATE policy to PERMISSIVE
DROP POLICY IF EXISTS "Owners and admins can update clinics" ON public.clinics;
CREATE POLICY "Owners and admins can update clinics"
ON public.clinics
FOR UPDATE
USING (has_clinic_role(auth.uid(), id, 'owner'::clinic_role) OR has_clinic_role(auth.uid(), id, 'admin'::clinic_role));

-- Fix clinic_members INSERT policy to PERMISSIVE
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.clinic_members;
CREATE POLICY "Owners and admins can add members"
ON public.clinic_members
FOR INSERT
WITH CHECK (
  has_clinic_role(auth.uid(), clinic_id, 'owner'::clinic_role)
  OR has_clinic_role(auth.uid(), clinic_id, 'admin'::clinic_role)
  OR (auth.uid() = user_id)
);

-- Fix clinic_members SELECT policy to PERMISSIVE
DROP POLICY IF EXISTS "Members can view clinic members" ON public.clinic_members;
CREATE POLICY "Members can view clinic members"
ON public.clinic_members
FOR SELECT
USING (is_clinic_member(auth.uid(), clinic_id));

-- Fix clinic_members UPDATE policy to PERMISSIVE
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.clinic_members;
CREATE POLICY "Owners and admins can update members"
ON public.clinic_members
FOR UPDATE
USING (has_clinic_role(auth.uid(), clinic_id, 'owner'::clinic_role) OR has_clinic_role(auth.uid(), clinic_id, 'admin'::clinic_role));

-- Fix clinic_members DELETE policy to PERMISSIVE
DROP POLICY IF EXISTS "Owners can remove members" ON public.clinic_members;
CREATE POLICY "Owners can remove members"
ON public.clinic_members
FOR DELETE
USING (has_clinic_role(auth.uid(), clinic_id, 'owner'::clinic_role));
