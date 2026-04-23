-- ────────────────────────────────────────────────────────────────────────────────
-- ADMINISTRATIVE RLS OVERRIDES
-- This script grants Website Administrators (role = 'admin' or 'superadmin') 
-- full platform oversight, allowing them to manage organizations, members, 
-- and forms regardless of their membership status.
-- ────────────────────────────────────────────────────────────────────────────────

-- 1. Organizations Overrides
-- Allows Website Admins to view, update, and delete any organization.
CREATE POLICY "Admins have full access to organizations" 
ON public.organizations 
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- 2. Organization Members Overrides
-- Allows Website Admins to manage memberships (add/remove members, change roles).
CREATE POLICY "Admins have full access to organization members" 
ON public.organization_members 
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- 3. Forms Overrides
-- Allows Website Admins to view and manage all forms across the platform.
CREATE POLICY "Admins have full access to forms" 
ON public.forms 
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- 4. Form Responses Overrides (Submissions)
-- Allows Website Admins to view all form responses.
CREATE POLICY "Admins have full access to form responses" 
ON public.form_responses 
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- 5. Form Fields Overrides
-- Allows Website Admins to manage all form fields.
CREATE POLICY "Admins have full access to form fields" 
ON public.form_fields 
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- 6. Active Form Sessions Overrides
-- Allows Website Admins to monitor and manage all active form sessions.
CREATE POLICY "Admins have full access to active form sessions" 
ON public.active_form_sessions 
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- 7. Assets Overrides
-- Allows Website Admins to manage all uploaded assets.
CREATE POLICY "Admins have full access to assets" 
ON public.assets 
FOR ALL 
TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- Note: These policies use the existing `is_admin()` helper function which 
-- checks the `public.users` table for 'admin' or 'superadmin' roles.
-- ────────────────────────────────────────────────────────────────────────────────
