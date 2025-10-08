-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'designer')),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Only owners can insert/update/delete profiles
CREATE POLICY "Only owners can manage profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into user_profiles with appropriate role
  INSERT INTO user_profiles (id, email, role, name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'design@renemoravec.sk' THEN 'owner'
      WHEN NEW.email = 'valentinabusova148@gmail.com' THEN 'designer'
      ELSE 'designer'  -- Default role for any other emails
    END,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies for existing tables to respect user roles

-- Projects: Owners can do everything, designers can read and update their assigned projects
DROP POLICY IF EXISTS "Users can read projects" ON projects;
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;

CREATE POLICY "Owners can manage all projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can read assigned projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE pm.project_id = projects.id 
      AND pm.user_id = auth.uid()
      AND up.role = 'designer'
    )
  );

-- Tasks: Similar to projects
DROP POLICY IF EXISTS "Users can read tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;

CREATE POLICY "Owners can manage all tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can manage tasks in assigned projects" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE pm.project_id = tasks.project_id 
      AND pm.user_id = auth.uid()
      AND up.role = 'designer'
    )
  );

-- Time entries: Designers can only see their own entries
DROP POLICY IF EXISTS "Users can read time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can insert time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete time entries" ON time_entries;

CREATE POLICY "Owners can manage all time entries" ON time_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Designers can manage own time entries" ON time_entries
  FOR ALL USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'designer'
    )
  );

-- Cost items: Only owners can see costs
DROP POLICY IF EXISTS "Users can read cost items" ON cost_items;
DROP POLICY IF EXISTS "Users can insert cost items" ON cost_items;
DROP POLICY IF EXISTS "Users can update cost items" ON cost_items;
DROP POLICY IF EXISTS "Users can delete cost items" ON cost_items;

CREATE POLICY "Only owners can manage cost items" ON cost_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Clients: Only owners can manage clients
DROP POLICY IF EXISTS "Users can read clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

CREATE POLICY "Only owners can manage clients" ON clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Note: Initial users will be created through Supabase Auth
-- The trigger will automatically create user_profiles when users sign up

-- Note: Designer accounts should be created through Supabase Auth dashboard
-- The trigger will automatically create user_profiles when users sign up
