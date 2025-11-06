-- Migration: Create roles and permissions system
-- Purpose: Allow superadmin to create custom roles and manage permissions

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL, -- e.g., 'projects', 'tasks', 'time_entries', 'invoices'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'manage'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Create user_roles table (for assigning custom roles to users)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL means global role
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id, workspace_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_workspace_id ON user_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- Insert default system roles
INSERT INTO roles (name, description, is_system_role) VALUES
  ('owner', 'Majiteľ - plný prístup k workspace', TRUE),
  ('member', 'Člen - obmedzený prístup k workspace', TRUE),
  ('admin', 'Administrátor - plný systémový prístup', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions for common resources
INSERT INTO permissions (name, description, resource, action) VALUES
  -- Projects permissions
  ('projects.create', 'Create new projects', 'projects', 'create'),
  ('projects.read', 'View projects', 'projects', 'read'),
  ('projects.update', 'Update projects', 'projects', 'update'),
  ('projects.delete', 'Delete projects', 'projects', 'delete'),
  ('projects.manage', 'Full project management', 'projects', 'manage'),
  
  -- Tasks permissions
  ('tasks.create', 'Create new tasks', 'tasks', 'create'),
  ('tasks.read', 'View tasks', 'tasks', 'read'),
  ('tasks.update', 'Update tasks', 'tasks', 'update'),
  ('tasks.delete', 'Delete tasks', 'tasks', 'delete'),
  ('tasks.manage', 'Full task management', 'tasks', 'manage'),
  
  -- Time entries permissions
  ('time_entries.create', 'Create time entries', 'time_entries', 'create'),
  ('time_entries.read', 'View time entries', 'time_entries', 'read'),
  ('time_entries.update', 'Update time entries', 'time_entries', 'update'),
  ('time_entries.delete', 'Delete time entries', 'time_entries', 'delete'),
  ('time_entries.manage', 'Full time entry management', 'time_entries', 'manage'),
  
  -- Invoices permissions
  ('invoices.create', 'Create invoices', 'invoices', 'create'),
  ('invoices.read', 'View invoices', 'invoices', 'read'),
  ('invoices.update', 'Update invoices', 'invoices', 'update'),
  ('invoices.delete', 'Delete invoices', 'invoices', 'delete'),
  ('invoices.manage', 'Full invoice management', 'invoices', 'manage'),
  
  -- Clients permissions
  ('clients.create', 'Create clients', 'clients', 'create'),
  ('clients.read', 'View clients', 'clients', 'read'),
  ('clients.update', 'Update clients', 'clients', 'update'),
  ('clients.delete', 'Delete clients', 'clients', 'delete'),
  ('clients.manage', 'Full client management', 'clients', 'manage'),
  
  -- Workspace permissions
  ('workspace.read', 'View workspace settings', 'workspace', 'read'),
  ('workspace.update', 'Update workspace settings', 'workspace', 'update'),
  ('workspace.manage', 'Full workspace management', 'workspace', 'manage'),
  ('workspace.members.manage', 'Manage workspace members', 'workspace', 'manage_members'),
  
  -- Users permissions
  ('users.read', 'View users', 'users', 'read'),
  ('users.update', 'Update users', 'users', 'update'),
  ('users.delete', 'Delete users', 'users', 'delete'),
  ('users.manage', 'Full user management', 'users', 'manage'),
  
  -- Roles and permissions management
  ('roles.read', 'View roles', 'roles', 'read'),
  ('roles.create', 'Create roles', 'roles', 'create'),
  ('roles.update', 'Update roles', 'roles', 'update'),
  ('roles.delete', 'Delete roles', 'roles', 'delete'),
  ('roles.manage', 'Full role management', 'roles', 'manage'),
  ('permissions.read', 'View permissions', 'permissions', 'read'),
  ('permissions.manage', 'Full permission management', 'permissions', 'manage'),
  
  -- Financial visibility permissions
  ('financial.view_prices', 'View prices and budgets', 'financial', 'view_prices'),
  ('financial.view_hourly_rates', 'View hourly rates', 'financial', 'view_hourly_rates'),
  ('financial.view_reports', 'View financial reports', 'financial', 'view_reports'),
  ('financial.view_profit', 'View profit/loss information', 'financial', 'view_profit'),
  ('financial.view_costs', 'View costs and expenses', 'financial', 'view_costs'),
  ('financial.view_invoices', 'View invoices', 'financial', 'view_invoices'),
  ('financial.manage', 'Full financial access', 'financial', 'manage'),
  
  -- Page access permissions
  ('pages.view_dashboard', 'View dashboard page', 'pages', 'view_dashboard'),
  ('pages.view_projects', 'View projects page', 'pages', 'view_projects'),
  ('pages.view_clients', 'View clients page', 'pages', 'view_clients'),
  ('pages.view_tasks', 'View tasks page', 'pages', 'view_tasks'),
  ('pages.view_time_entries', 'View time entries page', 'pages', 'view_time_entries'),
  ('pages.view_invoices', 'View invoices page', 'pages', 'view_invoices'),
  ('pages.view_settings', 'View settings page', 'pages', 'view_settings'),
  ('pages.view_workspace_users', 'View workspace users management', 'pages', 'view_workspace_users'),
  ('pages.view_admin_roles', 'View admin roles management', 'pages', 'view_admin_roles'),
  ('pages.view_admin_bugs', 'View admin bugs page', 'pages', 'view_admin_bugs')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign default permissions to system roles
-- Owner role gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'owner'),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member role gets read permissions (but NOT financial permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'member'),
  id
FROM permissions
WHERE action IN ('read')
  AND resource NOT IN ('financial', 'invoices', 'pages')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member gets access to basic pages
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'member'),
  id
FROM permissions
WHERE resource = 'pages'
  AND action IN ('view_dashboard', 'view_projects', 'view_clients', 'view_tasks', 'view_time_entries', 'view_settings')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member can also create/update own tasks and time entries
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'member'),
  id
FROM permissions
WHERE (resource = 'tasks' AND action IN ('create', 'update'))
   OR (resource = 'time_entries' AND action IN ('create', 'update'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin role gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin'),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;


-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Admins can view all permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can view role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can manage role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can view user_roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON user_roles;

-- RLS Policies for roles table
-- Only admins can view all roles
CREATE POLICY "Admins can view all roles" ON roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can create/update/delete roles
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for permissions table
-- Only admins can view all permissions
CREATE POLICY "Admins can view all permissions" ON permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can manage permissions
CREATE POLICY "Admins can manage permissions" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for role_permissions table
-- Only admins can view role_permissions
CREATE POLICY "Admins can view role_permissions" ON role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can manage role_permissions
CREATE POLICY "Admins can manage role_permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for user_roles table
-- Only admins can view user_roles
CREATE POLICY "Admins can view user_roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can manage user_roles
CREATE POLICY "Admins can manage user_roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin (admins have all permissions)
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is workspace owner (owners have all permissions in their workspace)
  IF p_workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check user's custom roles
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.resource = p_resource
      AND p.action = p_action
      AND (ur.workspace_id = p_workspace_id OR ur.workspace_id IS NULL)
  ) INTO v_has_permission;
  
  -- If no custom role found, check workspace_members role
  IF NOT v_has_permission AND p_workspace_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM workspace_members wm
      JOIN roles r ON r.name = wm.role
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE wm.user_id = p_user_id
        AND wm.workspace_id = p_workspace_id
        AND p.resource = p_resource
        AND p.action = p_action
    ) INTO v_has_permission;
  END IF;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT, TEXT, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE roles IS 'Custom roles that can be created by admins';
COMMENT ON TABLE permissions IS 'Available permissions in the system';
COMMENT ON TABLE role_permissions IS 'Junction table linking roles to permissions';
COMMENT ON TABLE user_roles IS 'Custom roles assigned to users';
COMMENT ON FUNCTION has_permission IS 'Check if a user has a specific permission';

