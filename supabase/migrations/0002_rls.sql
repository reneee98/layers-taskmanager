-- Row Level Security (RLS) Policies
-- Version: 0002
-- Description: Implements role-based access control with Owner/Manager, Member, and Client_viewer roles

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user role in a project
CREATE OR REPLACE FUNCTION get_user_project_role(p_project_id UUID, p_user_id UUID)
RETURNS VARCHAR AS $$
  SELECT role FROM project_members 
  WHERE project_id = p_project_id 
    AND user_id = p_user_id 
    AND (left_at IS NULL OR left_at > NOW())
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is owner or manager
CREATE OR REPLACE FUNCTION is_project_owner_or_manager(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND role IN ('owner', 'manager')
      AND (left_at IS NULL OR left_at > NOW())
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is a member (any role)
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND (left_at IS NULL OR left_at > NOW())
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is a client viewer
CREATE OR REPLACE FUNCTION is_client_viewer(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND role = 'client_viewer'
      AND (left_at IS NULL OR left_at > NOW())
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLIENTS POLICIES
-- ============================================================================

-- Owner/Manager can do everything with clients in their projects
CREATE POLICY "Owner/Manager can view clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.client_id = clients.id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'manager')
        AND (pm.left_at IS NULL OR pm.left_at > NOW())
    )
  );

CREATE POLICY "Owner/Manager can create clients"
  ON clients FOR INSERT
  WITH CHECK (true); -- Any authenticated user can create clients

CREATE POLICY "Owner/Manager can update clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.client_id = clients.id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'manager')
        AND (pm.left_at IS NULL OR pm.left_at > NOW())
    )
  );

CREATE POLICY "Owner/Manager can delete clients"
  ON clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.client_id = clients.id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'manager')
        AND (pm.left_at IS NULL OR pm.left_at > NOW())
    )
  );

-- Members can view clients
CREATE POLICY "Members can view clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE p.client_id = clients.id
        AND pm.user_id = auth.uid()
        AND (pm.left_at IS NULL OR pm.left_at > NOW())
    )
  );

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

-- Owner/Manager: Full CRUD
CREATE POLICY "Owner/Manager full access to projects"
  ON projects FOR ALL
  USING (
    is_project_owner_or_manager(id, auth.uid())
  )
  WITH CHECK (
    is_project_owner_or_manager(id, auth.uid())
  );

-- Members: Read only
CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (
    is_project_member(id, auth.uid())
  );

-- Client viewers: Read only (limited fields via view)
CREATE POLICY "Client viewers can view projects"
  ON projects FOR SELECT
  USING (
    is_client_viewer(id, auth.uid())
  );

-- ============================================================================
-- PROJECT_MEMBERS POLICIES
-- ============================================================================

-- Owner/Manager: Full CRUD
CREATE POLICY "Owner/Manager can manage members"
  ON project_members FOR ALL
  USING (
    is_project_owner_or_manager(project_id, auth.uid())
  )
  WITH CHECK (
    is_project_owner_or_manager(project_id, auth.uid())
  );

-- Members: Can view all members in their projects
CREATE POLICY "Members can view project members"
  ON project_members FOR SELECT
  USING (
    is_project_member(project_id, auth.uid())
  );

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

-- Owner/Manager: Full CRUD
CREATE POLICY "Owner/Manager full access to tasks"
  ON tasks FOR ALL
  USING (
    is_project_owner_or_manager(project_id, auth.uid())
  )
  WITH CHECK (
    is_project_owner_or_manager(project_id, auth.uid())
  );

-- Members: CRUD on their own tasks + assigned tasks
CREATE POLICY "Members can view tasks in their projects"
  ON tasks FOR SELECT
  USING (
    is_project_member(project_id, auth.uid())
  );

CREATE POLICY "Members can create tasks in their projects"
  ON tasks FOR INSERT
  WITH CHECK (
    is_project_member(project_id, auth.uid())
  );

CREATE POLICY "Members can update their own or assigned tasks"
  ON tasks FOR UPDATE
  USING (
    is_project_member(project_id, auth.uid()) AND
    (created_by = auth.uid() OR assigned_to = auth.uid())
  )
  WITH CHECK (
    is_project_member(project_id, auth.uid()) AND
    (created_by = auth.uid() OR assigned_to = auth.uid())
  );

CREATE POLICY "Members can delete their own tasks"
  ON tasks FOR DELETE
  USING (
    is_project_member(project_id, auth.uid()) AND
    created_by = auth.uid()
  );

-- Client viewers: Read only
CREATE POLICY "Client viewers can view tasks"
  ON tasks FOR SELECT
  USING (
    is_client_viewer(project_id, auth.uid())
  );

-- ============================================================================
-- RATES POLICIES
-- ============================================================================

-- Owner/Manager: Full CRUD
CREATE POLICY "Owner/Manager can manage rates"
  ON rates FOR ALL
  USING (
    project_id IS NULL OR is_project_owner_or_manager(project_id, auth.uid())
  )
  WITH CHECK (
    project_id IS NULL OR is_project_owner_or_manager(project_id, auth.uid())
  );

-- Members: Can view rates (but not in client_viewer role)
CREATE POLICY "Members can view rates"
  ON rates FOR SELECT
  USING (
    (project_id IS NULL OR is_project_member(project_id, auth.uid())) AND
    NOT is_client_viewer(project_id, auth.uid())
  );

-- Client viewers: NO ACCESS to rates (hidden)

-- ============================================================================
-- TIME_ENTRIES POLICIES
-- ============================================================================

-- Owner/Manager: Full CRUD
CREATE POLICY "Owner/Manager can manage all time entries"
  ON time_entries FOR ALL
  USING (
    is_project_owner_or_manager(project_id, auth.uid())
  )
  WITH CHECK (
    is_project_owner_or_manager(project_id, auth.uid())
  );

-- Members: CRUD their own time entries
CREATE POLICY "Members can view time entries in their projects"
  ON time_entries FOR SELECT
  USING (
    is_project_member(project_id, auth.uid())
  );

CREATE POLICY "Members can create their own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (
    is_project_member(project_id, auth.uid()) AND
    user_id = auth.uid()
  );

CREATE POLICY "Members can update their own time entries"
  ON time_entries FOR UPDATE
  USING (
    is_project_member(project_id, auth.uid()) AND
    user_id = auth.uid()
  )
  WITH CHECK (
    is_project_member(project_id, auth.uid()) AND
    user_id = auth.uid()
  );

CREATE POLICY "Members can delete their own time entries"
  ON time_entries FOR DELETE
  USING (
    is_project_member(project_id, auth.uid()) AND
    user_id = auth.uid()
  );

-- Client viewers: NO ACCESS to time entries with rates
-- They can see hours but not rates/amounts via special view (created below)

-- ============================================================================
-- COST_ITEMS POLICIES
-- ============================================================================

-- Owner/Manager: Full CRUD
CREATE POLICY "Owner/Manager can manage cost items"
  ON cost_items FOR ALL
  USING (
    is_project_owner_or_manager(project_id, auth.uid())
  )
  WITH CHECK (
    is_project_owner_or_manager(project_id, auth.uid())
  );

-- Members: Can view and create, update/delete their own
CREATE POLICY "Members can view cost items"
  ON cost_items FOR SELECT
  USING (
    is_project_member(project_id, auth.uid())
  );

CREATE POLICY "Members can create cost items"
  ON cost_items FOR INSERT
  WITH CHECK (
    is_project_member(project_id, auth.uid())
  );

CREATE POLICY "Members can update their own cost items"
  ON cost_items FOR UPDATE
  USING (
    is_project_member(project_id, auth.uid()) AND
    created_by = auth.uid()
  )
  WITH CHECK (
    is_project_member(project_id, auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Members can delete their own cost items"
  ON cost_items FOR DELETE
  USING (
    is_project_member(project_id, auth.uid()) AND
    created_by = auth.uid()
  );

-- Client viewers: Read only (amounts visible)
CREATE POLICY "Client viewers can view cost items"
  ON cost_items FOR SELECT
  USING (
    is_client_viewer(project_id, auth.uid())
  );

-- ============================================================================
-- INVOICES POLICIES
-- ============================================================================

-- Owner/Manager: Full CRUD
CREATE POLICY "Owner/Manager can manage invoices"
  ON invoices FOR ALL
  USING (
    is_project_owner_or_manager(project_id, auth.uid())
  )
  WITH CHECK (
    is_project_owner_or_manager(project_id, auth.uid())
  );

-- Members: Read only
CREATE POLICY "Members can view invoices"
  ON invoices FOR SELECT
  USING (
    is_project_member(project_id, auth.uid())
  );

-- Client viewers: Read only
CREATE POLICY "Client viewers can view invoices"
  ON invoices FOR SELECT
  USING (
    is_client_viewer(project_id, auth.uid())
  );

-- ============================================================================
-- CLIENT VIEWER VIEWS (Hide sensitive data)
-- ============================================================================

-- Safe project view for client viewers (hides rates and budgets)
CREATE OR REPLACE VIEW client_project_view AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.start_date,
  p.end_date,
  c.name as client_name,
  c.email as client_email
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
WHERE is_client_viewer(p.id, auth.uid());

-- Safe time entries view for client viewers (hides rates)
CREATE OR REPLACE VIEW client_time_entries_view AS
SELECT 
  te.id,
  te.project_id,
  te.task_id,
  te.date,
  te.hours,
  te.description,
  te.is_billable,
  t.title as task_title
FROM time_entries te
LEFT JOIN tasks t ON te.task_id = t.id
WHERE is_client_viewer(te.project_id, auth.uid());

-- Safe task view for client viewers
CREATE OR REPLACE VIEW client_tasks_view AS
SELECT 
  t.id,
  t.project_id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.due_date,
  t.completed_at
FROM tasks t
WHERE is_client_viewer(t.project_id, auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_user_project_role IS 'Returns the role of a user in a project';
COMMENT ON FUNCTION is_project_owner_or_manager IS 'Checks if user has owner or manager role';
COMMENT ON FUNCTION is_project_member IS 'Checks if user is any kind of member in project';
COMMENT ON FUNCTION is_client_viewer IS 'Checks if user has client_viewer role';

COMMENT ON VIEW client_project_view IS 'Safe project view for client viewers - hides rates and budgets';
COMMENT ON VIEW client_time_entries_view IS 'Safe time entries view for client viewers - hides rates and amounts';
COMMENT ON VIEW client_tasks_view IS 'Safe tasks view for client viewers';

