-- Simple auth system migration
-- This creates a basic user_profiles table without complex triggers

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'designer' NOT NULL CHECK (role IN ('owner', 'designer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Owners can manage all profiles" ON public.user_profiles;

-- Create simple RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Owners can manage all profiles" ON public.user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Create function to handle new user signup (simplified)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.email = 'design@renemoravec.sk' THEN 'owner'
      ELSE 'designer'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update RLS policies for existing tables to work with roles
-- Projects
DROP POLICY IF EXISTS "Owners can manage all projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can create projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can update assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can delete assigned projects" ON public.projects;

CREATE POLICY "Owners can manage all projects" ON public.projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can view assigned projects" ON public.projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'designer')
    )
  );

CREATE POLICY "Designers can update assigned projects" ON public.projects
  FOR UPDATE USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  ) WITH CHECK (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can delete assigned projects" ON public.projects
  FOR DELETE USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Tasks
DROP POLICY IF EXISTS "Owners can manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Designers can view tasks in assigned projects" ON public.tasks;
DROP POLICY IF EXISTS "Designers can create tasks in assigned projects" ON public.tasks;
DROP POLICY IF EXISTS "Designers can update their own tasks or tasks in assigned projects" ON public.tasks;
DROP POLICY IF EXISTS "Designers can delete their own tasks or tasks in assigned projects" ON public.tasks;

CREATE POLICY "Owners can manage all tasks" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can view tasks in assigned projects" ON public.tasks
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can create tasks in assigned projects" ON public.tasks
  FOR INSERT WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can update their own tasks or tasks in assigned projects" ON public.tasks
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  ) WITH CHECK (
    assigned_to = auth.uid()
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can delete their own tasks or tasks in assigned projects" ON public.tasks
  FOR DELETE USING (
    assigned_to = auth.uid()
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Time entries
DROP POLICY IF EXISTS "Owners can manage all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Designers can manage their own time entries" ON public.time_entries;

CREATE POLICY "Owners can manage all time entries" ON public.time_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can manage their own time entries" ON public.time_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cost items
DROP POLICY IF EXISTS "Owners can manage all cost items" ON public.cost_items;
DROP POLICY IF EXISTS "Designers can view cost items in assigned projects" ON public.cost_items;

CREATE POLICY "Owners can manage all cost items" ON public.cost_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can view cost items in assigned projects" ON public.cost_items
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Clients
DROP POLICY IF EXISTS "Owners can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Designers can view clients in assigned projects" ON public.clients;

CREATE POLICY "Owners can manage all clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can view clients in assigned projects" ON public.clients
  FOR SELECT USING (
    id IN (SELECT c.id FROM public.clients c JOIN public.projects p ON c.id = p.client_id JOIN public.project_members pm ON p.id = pm.project_id WHERE pm.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Rates (only owners can see)
DROP POLICY IF EXISTS "Owners can manage all rates" ON public.rates;
DROP POLICY IF EXISTS "Designers cannot view rates" ON public.rates;

CREATE POLICY "Owners can manage all rates" ON public.rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers cannot view rates" ON public.rates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
