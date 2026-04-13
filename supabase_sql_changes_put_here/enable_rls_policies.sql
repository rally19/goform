-- 1. Enable Row Level Security on all tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.active_form_sessions ENABLE ROW LEVEL SECURITY;
-- Skipping api_keys as it may not exist yet


-- 2. ENSURING FULL DATABASE BROADCASTS (For Realtime + RLS)
ALTER TABLE IF EXISTS public.form_fields REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.forms REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.active_form_sessions REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.organizations REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.organization_members REPLICA IDENTITY FULL;


-- 3. HELPER FUNCTIONS
-- This function allows us to check membership without recursion issues
CREATE OR REPLACE FUNCTION public.is_member_of(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. POLICIES FOR 'users'
CREATE POLICY "Users can read their own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid()::text = id);

CREATE POLICY "Users can read profiles of team members"
ON public.users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members m1
    WHERE m1.user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.organization_members m2
      WHERE m2.organization_id = m1.organization_id
      AND m2.user_id = public.users.id
    )
  )
);

-- 5. POLICIES FOR 'organizations'
CREATE POLICY "Members can read their organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.is_member_of(id));

-- 6. POLICIES FOR 'organization_members'
CREATE POLICY "Users can read their own membership"
ON public.organization_members FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Members can read team membership"
ON public.organization_members FOR SELECT
TO authenticated
USING (public.is_member_of(organization_id));

-- 7. POLICIES FOR 'forms'
-- Owner access
CREATE POLICY "User has full access to personal forms"
ON public.forms FOR ALL
TO authenticated
USING (user_id = auth.uid()::text AND organization_id IS NULL);

-- Org access (Read)
CREATE POLICY "Org members can read org forms"
ON public.forms FOR SELECT
TO authenticated
USING (public.is_member_of(organization_id));

-- Org access (Write for editors+)
CREATE POLICY "Org editors can update org forms"
ON public.forms FOR ALL
TO authenticated
USING (
  public.is_member_of(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = public.forms.organization_id
    AND user_id = auth.uid()::text
    AND role IN ('owner', 'administrator', 'manager', 'editor')
  )
);

-- Public access (Read active forms for realtime)
CREATE POLICY "Public can read active forms"
ON public.forms FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- 8. POLICIES FOR 'form_fields'
CREATE POLICY "Users can read fields if they can read the form"
ON public.form_fields FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = public.form_fields.form_id
  )
);

CREATE POLICY "Users can manage fields if they can manage the form"
ON public.form_fields FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = public.form_fields.form_id
    AND (
      (user_id = auth.uid()::text AND organization_id IS NULL)
      OR (
        public.is_member_of(organization_id)
        AND EXISTS (
          SELECT 1 FROM public.organization_members
          WHERE organization_id = public.forms.organization_id
          AND user_id = auth.uid()::text
          AND role IN ('owner', 'administrator', 'manager', 'editor')
        )
      )
    )
  )
);

-- 9. POLICIES FOR 'form_responses'
CREATE POLICY "Public can insert responses"
ON public.form_responses FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Owners can manage responses"
ON public.form_responses FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = public.form_responses.form_id
    AND (
      (user_id = auth.uid()::text AND organization_id IS NULL)
      OR public.is_member_of(organization_id)
    )
  )
);

-- 10. POLICIES FOR 'active_form_sessions'
CREATE POLICY "Users can read sessions for accessible forms"
ON public.active_form_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = public.active_form_sessions.form_id
  )
);

CREATE POLICY "Users can manage their own session"
ON public.active_form_sessions FOR ALL
TO authenticated
USING (user_id = auth.uid()::text);

-- 11. POLICIES FOR 'api_keys' (Disabled as table may not exist)
-- CREATE POLICY "Users can manage their own API keys"
-- ON public.api_keys FOR ALL
-- TO authenticated
-- USING (user_id = auth.uid()::text);


-- 12. POLICIES FOR 'organization_invites'
CREATE POLICY "Users can read invites related to them"
ON public.organization_invites FOR SELECT
TO authenticated
USING (
  email = auth.jwt() ->> 'email'
  OR public.is_member_of(organization_id)
);
