
-- Clinics table
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  specialties TEXT[] DEFAULT '{}',
  bed_count INTEGER,
  opd_capacity INTEGER,
  logo_url TEXT,
  whatsapp_number TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Clinic members (doctors, nurses, admins)
CREATE TYPE public.clinic_role AS ENUM ('owner', 'admin', 'doctor', 'nurse', 'staff');

CREATE TABLE public.clinic_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role clinic_role NOT NULL DEFAULT 'doctor',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- Clinic invites
CREATE TABLE public.clinic_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role clinic_role NOT NULL DEFAULT 'doctor',
  invite_code TEXT NOT NULL UNIQUE DEFAULT UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 8)),
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.clinic_invites ENABLE ROW LEVEL SECURITY;

-- Add clinic_id to patients table
ALTER TABLE public.patients ADD COLUMN clinic_id UUID REFERENCES public.clinics(id);

-- Security definer function: check if user is member of a clinic
CREATE OR REPLACE FUNCTION public.is_clinic_member(_user_id UUID, _clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = _user_id AND clinic_id = _clinic_id
  )
$$;

-- Security definer: check clinic role
CREATE OR REPLACE FUNCTION public.has_clinic_role(_user_id UUID, _clinic_id UUID, _role clinic_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE user_id = _user_id AND clinic_id = _clinic_id AND role = _role
  )
$$;

-- Security definer: get user's clinic IDs
CREATE OR REPLACE FUNCTION public.get_user_clinic_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.clinic_members WHERE user_id = _user_id
$$;

-- RLS: Clinics - members can view their clinics
CREATE POLICY "Members can view their clinics"
  ON public.clinics FOR SELECT
  USING (public.is_clinic_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create clinics"
  ON public.clinics FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update clinics"
  ON public.clinics FOR UPDATE
  USING (
    public.has_clinic_role(auth.uid(), id, 'owner') OR
    public.has_clinic_role(auth.uid(), id, 'admin')
  );

-- RLS: Clinic members
CREATE POLICY "Members can view clinic members"
  ON public.clinic_members FOR SELECT
  USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Owners and admins can add members"
  ON public.clinic_members FOR INSERT
  WITH CHECK (
    public.has_clinic_role(auth.uid(), clinic_id, 'owner') OR
    public.has_clinic_role(auth.uid(), clinic_id, 'admin') OR
    auth.uid() = user_id
  );

CREATE POLICY "Owners and admins can update members"
  ON public.clinic_members FOR UPDATE
  USING (
    public.has_clinic_role(auth.uid(), clinic_id, 'owner') OR
    public.has_clinic_role(auth.uid(), clinic_id, 'admin')
  );

CREATE POLICY "Owners can remove members"
  ON public.clinic_members FOR DELETE
  USING (public.has_clinic_role(auth.uid(), clinic_id, 'owner'));

-- RLS: Clinic invites
CREATE POLICY "Members can view clinic invites"
  ON public.clinic_invites FOR SELECT
  USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Admins can create invites"
  ON public.clinic_invites FOR INSERT
  WITH CHECK (
    public.has_clinic_role(auth.uid(), clinic_id, 'owner') OR
    public.has_clinic_role(auth.uid(), clinic_id, 'admin')
  );

CREATE POLICY "Admins can update invites"
  ON public.clinic_invites FOR UPDATE
  USING (
    public.has_clinic_role(auth.uid(), clinic_id, 'owner') OR
    public.has_clinic_role(auth.uid(), clinic_id, 'admin')
  );

-- Allow anyone to read invites by invite_code (for accepting)
CREATE POLICY "Anyone can look up invites by code"
  ON public.clinic_invites FOR SELECT
  USING (status = 'pending');

-- Trigger for updated_at on clinics
CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
