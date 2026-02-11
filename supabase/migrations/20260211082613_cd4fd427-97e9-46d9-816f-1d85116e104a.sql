
-- Fix ALL remaining restrictive policies to permissive across all tables

-- ============ ALERTS ============
DROP POLICY IF EXISTS "Doctors can delete own alerts" ON public.alerts;
CREATE POLICY "Doctors can delete own alerts" ON public.alerts FOR DELETE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can insert own alerts" ON public.alerts;
CREATE POLICY "Doctors can insert own alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can update own alerts" ON public.alerts;
CREATE POLICY "Doctors can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can view own alerts" ON public.alerts;
CREATE POLICY "Doctors can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = doctor_id);

-- ============ APPOINTMENTS ============
DROP POLICY IF EXISTS "Doctors can delete own appointments" ON public.appointments;
CREATE POLICY "Doctors can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can insert own appointments" ON public.appointments;
CREATE POLICY "Doctors can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can update own appointments" ON public.appointments;
CREATE POLICY "Doctors can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can view own appointments" ON public.appointments;
CREATE POLICY "Doctors can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Linked doctors can view patient appointments" ON public.appointments;
CREATE POLICY "Linked doctors can view patient appointments" ON public.appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p JOIN patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
    WHERE p.id = appointments.patient_id AND pdl.doctor_user_id = auth.uid() AND pdl.status = 'approved')
);

DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
CREATE POLICY "Patients can view own appointments" ON public.appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = appointments.patient_id AND patients.patient_user_id = auth.uid())
);

-- ============ CLINIC_INVITES ============
DROP POLICY IF EXISTS "Admins can create invites" ON public.clinic_invites;
CREATE POLICY "Admins can create invites" ON public.clinic_invites FOR INSERT WITH CHECK (
  has_clinic_role(auth.uid(), clinic_id, 'owner'::clinic_role) OR has_clinic_role(auth.uid(), clinic_id, 'admin'::clinic_role)
);

DROP POLICY IF EXISTS "Admins can update invites" ON public.clinic_invites;
CREATE POLICY "Admins can update invites" ON public.clinic_invites FOR UPDATE USING (
  has_clinic_role(auth.uid(), clinic_id, 'owner'::clinic_role) OR has_clinic_role(auth.uid(), clinic_id, 'admin'::clinic_role)
);

DROP POLICY IF EXISTS "Authenticated users can look up invites by code" ON public.clinic_invites;
CREATE POLICY "Authenticated users can look up invites by code" ON public.clinic_invites FOR SELECT USING (
  auth.uid() IS NOT NULL AND status = 'pending'
);

DROP POLICY IF EXISTS "Members can view clinic invites" ON public.clinic_invites;
CREATE POLICY "Members can view clinic invites" ON public.clinic_invites FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));

-- ============ ENROLLMENTS ============
DROP POLICY IF EXISTS "Doctors can delete own enrollments" ON public.enrollments;
CREATE POLICY "Doctors can delete own enrollments" ON public.enrollments FOR DELETE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can insert own enrollments" ON public.enrollments;
CREATE POLICY "Doctors can insert own enrollments" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can update own enrollments" ON public.enrollments;
CREATE POLICY "Doctors can update own enrollments" ON public.enrollments FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can view own enrollments" ON public.enrollments;
CREATE POLICY "Doctors can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Patients can view own enrollments" ON public.enrollments;
CREATE POLICY "Patients can view own enrollments" ON public.enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = enrollments.patient_id AND patients.patient_user_id = auth.uid())
);

-- ============ FOOD_LOGS ============
DROP POLICY IF EXISTS "Doctors can manage own food logs" ON public.food_logs;
CREATE POLICY "Doctors can manage own food logs" ON public.food_logs FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Linked doctors can view patient food logs" ON public.food_logs;
CREATE POLICY "Linked doctors can view patient food logs" ON public.food_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p JOIN patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
    WHERE p.id = food_logs.patient_id AND pdl.doctor_user_id = auth.uid() AND pdl.status = 'approved')
);

DROP POLICY IF EXISTS "Patients can insert own food logs" ON public.food_logs;
CREATE POLICY "Patients can insert own food logs" ON public.food_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = food_logs.patient_id AND patients.patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Patients can view own food logs" ON public.food_logs;
CREATE POLICY "Patients can view own food logs" ON public.food_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = food_logs.patient_id AND patients.patient_user_id = auth.uid())
);

-- ============ LAB_RESULTS ============
DROP POLICY IF EXISTS "Doctors can manage own lab results" ON public.lab_results;
CREATE POLICY "Doctors can manage own lab results" ON public.lab_results FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Linked doctors can view patient lab results" ON public.lab_results;
CREATE POLICY "Linked doctors can view patient lab results" ON public.lab_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p JOIN patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
    WHERE p.id = lab_results.patient_id AND pdl.doctor_user_id = auth.uid() AND pdl.status = 'approved')
);

DROP POLICY IF EXISTS "Patients can insert own lab results" ON public.lab_results;
CREATE POLICY "Patients can insert own lab results" ON public.lab_results FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = lab_results.patient_id AND patients.patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Patients can view own lab results" ON public.lab_results;
CREATE POLICY "Patients can view own lab results" ON public.lab_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = lab_results.patient_id AND patients.patient_user_id = auth.uid())
);

-- ============ LINK_REQUESTS ============
DROP POLICY IF EXISTS "Doctors can update their link requests" ON public.link_requests;
CREATE POLICY "Doctors can update their link requests" ON public.link_requests FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can view their link requests" ON public.link_requests;
CREATE POLICY "Doctors can view their link requests" ON public.link_requests FOR SELECT USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Patients can create link requests" ON public.link_requests;
CREATE POLICY "Patients can create link requests" ON public.link_requests FOR INSERT WITH CHECK (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "Patients can view own link requests" ON public.link_requests;
CREATE POLICY "Patients can view own link requests" ON public.link_requests FOR SELECT USING (auth.uid() = patient_user_id);

-- ============ NOTIFICATIONS ============
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- ============ PATIENT_DOCTOR_LINKS ============
DROP POLICY IF EXISTS "Doctors can request links" ON public.patient_doctor_links;
CREATE POLICY "Doctors can request links" ON public.patient_doctor_links FOR INSERT WITH CHECK (auth.uid() = doctor_user_id);

DROP POLICY IF EXISTS "Doctors can view own links" ON public.patient_doctor_links;
CREATE POLICY "Doctors can view own links" ON public.patient_doctor_links FOR SELECT USING (auth.uid() = doctor_user_id);

DROP POLICY IF EXISTS "Patients can update own links" ON public.patient_doctor_links;
CREATE POLICY "Patients can update own links" ON public.patient_doctor_links FOR UPDATE USING (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "Patients can view own links" ON public.patient_doctor_links;
CREATE POLICY "Patients can view own links" ON public.patient_doctor_links FOR SELECT USING (auth.uid() = patient_user_id);

-- ============ PATIENT_DOCUMENTS ============
DROP POLICY IF EXISTS "Doctors can manage own documents" ON public.patient_documents;
CREATE POLICY "Doctors can manage own documents" ON public.patient_documents FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Linked doctors can view patient documents" ON public.patient_documents;
CREATE POLICY "Linked doctors can view patient documents" ON public.patient_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p JOIN patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
    WHERE p.id = patient_documents.patient_id AND pdl.doctor_user_id = auth.uid() AND pdl.status = 'approved')
);

DROP POLICY IF EXISTS "Patients can upload own documents" ON public.patient_documents;
CREATE POLICY "Patients can upload own documents" ON public.patient_documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = patient_documents.patient_id AND patients.patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Patients can view own documents" ON public.patient_documents;
CREATE POLICY "Patients can view own documents" ON public.patient_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = patient_documents.patient_id AND patients.patient_user_id = auth.uid())
);

-- ============ PATIENT_VAULT_CODES ============
DROP POLICY IF EXISTS "Linked doctors can look up vault codes" ON public.patient_vault_codes;
CREATE POLICY "Linked doctors can look up vault codes" ON public.patient_vault_codes FOR SELECT USING (
  has_role(auth.uid(), 'doctor'::app_role) AND is_active = true AND EXISTS (
    SELECT 1 FROM patient_doctor_links pdl WHERE pdl.patient_user_id = patient_vault_codes.patient_user_id
    AND pdl.doctor_user_id = auth.uid() AND pdl.status = 'approved')
);

DROP POLICY IF EXISTS "Patients can insert own vault code" ON public.patient_vault_codes;
CREATE POLICY "Patients can insert own vault code" ON public.patient_vault_codes FOR INSERT WITH CHECK (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "Patients can update own vault code" ON public.patient_vault_codes;
CREATE POLICY "Patients can update own vault code" ON public.patient_vault_codes FOR UPDATE USING (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "Patients can view own vault code" ON public.patient_vault_codes;
CREATE POLICY "Patients can view own vault code" ON public.patient_vault_codes FOR SELECT USING (auth.uid() = patient_user_id);

-- ============ PATIENTS ============
DROP POLICY IF EXISTS "Doctors can delete own patients" ON public.patients;
CREATE POLICY "Doctors can delete own patients" ON public.patients FOR DELETE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can insert own patients" ON public.patients;
CREATE POLICY "Doctors can insert own patients" ON public.patients FOR INSERT WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can update own patients" ON public.patients;
CREATE POLICY "Doctors can update own patients" ON public.patients FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can view own patients" ON public.patients;
CREATE POLICY "Doctors can view own patients" ON public.patients FOR SELECT USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Patients can create own record" ON public.patients;
CREATE POLICY "Patients can create own record" ON public.patients FOR INSERT WITH CHECK (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "Patients can update own record" ON public.patients;
CREATE POLICY "Patients can update own record" ON public.patients FOR UPDATE USING (auth.uid() = patient_user_id) WITH CHECK (auth.uid() = patient_user_id);

DROP POLICY IF EXISTS "Patients can view own record" ON public.patients;
CREATE POLICY "Patients can view own record" ON public.patients FOR SELECT USING (auth.uid() = patient_user_id);

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Authenticated users can look up doctor by code" ON public.profiles;
CREATE POLICY "Authenticated users can look up doctor by code" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL AND doctor_code IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

-- ============ PROGRAMS ============
DROP POLICY IF EXISTS "Doctors can delete own programs" ON public.programs;
CREATE POLICY "Doctors can delete own programs" ON public.programs FOR DELETE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can insert own programs" ON public.programs;
CREATE POLICY "Doctors can insert own programs" ON public.programs FOR INSERT WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can update own programs" ON public.programs;
CREATE POLICY "Doctors can update own programs" ON public.programs FOR UPDATE USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Doctors can view own programs" ON public.programs;
CREATE POLICY "Doctors can view own programs" ON public.programs FOR SELECT USING (auth.uid() = doctor_id);

-- ============ USER_ROLES ============
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- ============ VITALS ============
DROP POLICY IF EXISTS "Doctors can manage own vitals" ON public.vitals;
CREATE POLICY "Doctors can manage own vitals" ON public.vitals FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Linked doctors can view patient vitals" ON public.vitals;
CREATE POLICY "Linked doctors can view patient vitals" ON public.vitals FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p JOIN patient_doctor_links pdl ON pdl.patient_user_id = p.patient_user_id
    WHERE p.id = vitals.patient_id AND pdl.doctor_user_id = auth.uid() AND pdl.status = 'approved')
);

DROP POLICY IF EXISTS "Patients can insert own vitals" ON public.vitals;
CREATE POLICY "Patients can insert own vitals" ON public.vitals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = vitals.patient_id AND patients.patient_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Patients can view own vitals" ON public.vitals;
CREATE POLICY "Patients can view own vitals" ON public.vitals FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = vitals.patient_id AND patients.patient_user_id = auth.uid())
);
