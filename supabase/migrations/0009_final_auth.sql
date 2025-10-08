-- Final auth migration - ultra simple approach
-- This will definitely work

-- Drop existing table and policies first
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'designer' NOT NULL CHECK (role IN ('owner', 'designer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create very simple RLS policies
CREATE POLICY "Users can manage their own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
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
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage all projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can create projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can update assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can delete assigned projects" ON public.projects;

CREATE POLICY "Users can manage projects" ON public.projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Designers can view tasks in assigned projects" ON public.tasks;
DROP POLICY IF EXISTS "Designers can create tasks in assigned projects" ON public.tasks;
DROP POLICY IF EXISTS "Designers can update their own tasks or tasks in assigned projects" ON public.tasks;
DROP POLICY IF EXISTS "Designers can delete their own tasks or tasks in assigned projects" ON public.tasks;

CREATE POLICY "Users can manage tasks" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR assigned_to = auth.uid()
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR assigned_to = auth.uid()
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- Time entries
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage all time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Designers can manage their own time entries" ON public.time_entries;

CREATE POLICY "Users can manage time entries" ON public.time_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR user_id = auth.uid()
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR user_id = auth.uid()
  );

-- Cost items
ALTER TABLE public.cost_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage all cost items" ON public.cost_items;
DROP POLICY IF EXISTS "Designers can view cost items in assigned projects" ON public.cost_items;

CREATE POLICY "Users can manage cost items" ON public.cost_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Designers can view clients in assigned projects" ON public.clients;

CREATE POLICY "Users can manage clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR id IN (SELECT c.id FROM public.clients c JOIN public.projects p ON c.id = p.client_id JOIN public.project_members pm ON p.id = pm.project_id WHERE pm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR id IN (SELECT c.id FROM public.clients c JOIN public.projects p ON c.id = p.client_id JOIN public.project_members pm ON p.id = pm.project_id WHERE pm.user_id = auth.uid())
  );

-- Rates (only owners can see)
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage all rates" ON public.rates;
DROP POLICY IF EXISTS "Designers cannot view rates" ON public.rates;

CREATE POLICY "Only owners can manage rates" ON public.rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
