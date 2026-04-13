-- 1. Disable Row Level Security on all tables
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.form_fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.form_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.active_form_sessions DISABLE ROW LEVEL SECURITY;
-- Skipping api_keys as it may not exist yet


-- 2. Drop all policies created
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read profiles of team members" ON public.users;

DROP POLICY IF EXISTS "Members can read their organizations" ON public.organizations;

DROP POLICY IF EXISTS "Users can read their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Members can read team membership" ON public.organization_members;

DROP POLICY IF EXISTS "User has full access to personal forms" ON public.forms;
DROP POLICY IF EXISTS "Org members can read org forms" ON public.forms;
DROP POLICY IF EXISTS "Org editors can update org forms" ON public.forms;
DROP POLICY IF EXISTS "Public can read active forms" ON public.forms;

DROP POLICY IF EXISTS "Users can read fields if they can read the form" ON public.form_fields;
DROP POLICY IF EXISTS "Users can manage fields if they can manage the form" ON public.form_fields;

DROP POLICY IF EXISTS "Public can insert responses" ON public.form_responses;
DROP POLICY IF EXISTS "Owners can manage responses" ON public.form_responses;

DROP POLICY IF EXISTS "Users can read sessions for accessible forms" ON public.active_form_sessions;
DROP POLICY IF EXISTS "Users can manage their own session" ON public.active_form_sessions;

DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;

DROP POLICY IF EXISTS "Users can read invites related to them" ON public.organization_invites;

-- 3. Drop helper function
DROP FUNCTION IF EXISTS public.is_member_of(uuid);

-- 4. Reset Replica Identity (Optional, but returns to default 'default')
-- Most tables default to 'default' identity
ALTER TABLE IF EXISTS public.form_fields REPLICA IDENTITY DEFAULT;
ALTER TABLE IF EXISTS public.forms REPLICA IDENTITY DEFAULT;
ALTER TABLE IF EXISTS public.active_form_sessions REPLICA IDENTITY DEFAULT;
ALTER TABLE IF EXISTS public.organizations REPLICA IDENTITY DEFAULT;
ALTER TABLE IF EXISTS public.organization_members REPLICA IDENTITY DEFAULT;

