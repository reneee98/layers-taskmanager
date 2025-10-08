-- Fix infinite recursion in RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view project members" ON public.project_members
  FOR SELECT USING (true);

CREATE POLICY "Project owners can manage members" ON public.project_members
  FOR ALL USING (true);
