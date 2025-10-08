-- Layers Task Manager - Initial Schema Migration
-- Version: 0001
-- Description: Creates enums, tables, indexes, and views for task management system

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE project_status AS ENUM (
  'draft',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'review',
  'done',
  'cancelled'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  status project_status NOT NULL DEFAULT 'draft',
  currency VARCHAR(3) DEFAULT 'EUR',
  start_date DATE,
  end_date DATE,
  budget_hours NUMERIC(10, 3),
  budget_amount NUMERIC(12, 2),
  hourly_rate NUMERIC(10, 2),
  fixed_fee NUMERIC(12, 2),
  fee_markup_pct NUMERIC(5, 2),
  external_costs_budget NUMERIC(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Project members (team assignments)
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(100),
  hourly_rate NUMERIC(10, 2),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  estimated_hours NUMERIC(10, 3),
  actual_hours NUMERIC(10, 3) DEFAULT 0,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Rates table (for different rate types)
CREATE TABLE rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_rate_dates CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- Time entries table
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  hours NUMERIC(10, 3) NOT NULL,
  description TEXT,
  is_billable BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate NUMERIC(10, 2),
  amount NUMERIC(12, 2),
  invoiced BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_hours CHECK (hours > 0)
);

-- Cost items (external costs, materials, etc.)
CREATE TABLE cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  amount NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL,
  is_billable BOOLEAN NOT NULL DEFAULT TRUE,
  invoiced BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_id UUID,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT valid_invoice_dates CHECK (due_date >= issue_date),
  CONSTRAINT valid_amounts CHECK (
    subtotal >= 0 AND 
    tax_amount >= 0 AND 
    total_amount >= 0 AND 
    paid_amount >= 0 AND
    paid_amount <= total_amount
  )
);

-- Add invoice_id foreign keys after invoices table exists
ALTER TABLE time_entries 
  ADD CONSTRAINT fk_time_entries_invoice 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE cost_items 
  ADD CONSTRAINT fk_cost_items_invoice 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Clients indexes
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_created_at ON clients(created_at);

-- Projects indexes
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_end_date ON projects(end_date);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Project members indexes
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- Tasks indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Rates indexes
CREATE INDEX idx_rates_project_id ON rates(project_id);
CREATE INDEX idx_rates_user_id ON rates(user_id);
CREATE INDEX idx_rates_valid_from ON rates(valid_from);
CREATE INDEX idx_rates_valid_to ON rates(valid_to);

-- Time entries indexes
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_invoice_id ON time_entries(invoice_id);
CREATE INDEX idx_time_entries_billable ON time_entries(is_billable);
CREATE INDEX idx_time_entries_invoiced ON time_entries(invoiced);
CREATE INDEX idx_time_entries_created_at ON time_entries(created_at);

-- Cost items indexes
CREATE INDEX idx_cost_items_project_id ON cost_items(project_id);
CREATE INDEX idx_cost_items_task_id ON cost_items(task_id);
CREATE INDEX idx_cost_items_category ON cost_items(category);
CREATE INDEX idx_cost_items_date ON cost_items(date);
CREATE INDEX idx_cost_items_invoice_id ON cost_items(invoice_id);
CREATE INDEX idx_cost_items_billable ON cost_items(is_billable);
CREATE INDEX idx_cost_items_invoiced ON cost_items(invoiced);
CREATE INDEX idx_cost_items_created_at ON cost_items(created_at);

-- Invoices indexes
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Project finance view - aggregates financial data for each project
CREATE OR REPLACE VIEW project_finance_view AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.status AS project_status,
  c.name AS client_name,
  
  -- Billable hours (sum of billable time entries)
  COALESCE(SUM(te.hours) FILTER (WHERE te.is_billable = TRUE), 0) AS billable_hours,
  
  -- Labor cost (sum of time entry amounts)
  COALESCE(SUM(te.amount) FILTER (WHERE te.is_billable = TRUE), 0) AS labor_cost,
  
  -- External costs (sum of billable cost items)
  COALESCE(SUM(ci.amount) FILTER (WHERE ci.is_billable = TRUE), 0) AS external_cost,
  
  -- Fee amount (fixed fee from project)
  COALESCE(p.fixed_fee, 0) AS fee_amount,
  
  -- Total price (labor + external costs + fee)
  COALESCE(SUM(te.amount) FILTER (WHERE te.is_billable = TRUE), 0) + 
  COALESCE(SUM(ci.amount) FILTER (WHERE ci.is_billable = TRUE), 0) + 
  COALESCE(p.fixed_fee, 0) AS total_price,
  
  -- Margin (total price - budget)
  (COALESCE(SUM(te.amount) FILTER (WHERE te.is_billable = TRUE), 0) + 
   COALESCE(SUM(ci.amount) FILTER (WHERE ci.is_billable = TRUE), 0) + 
   COALESCE(p.fixed_fee, 0)) - 
  COALESCE(p.budget_amount, 0) AS margin,
  
  -- Margin percentage
  CASE 
    WHEN COALESCE(p.budget_amount, 0) > 0 THEN
      (((COALESCE(SUM(te.amount) FILTER (WHERE te.is_billable = TRUE), 0) + 
         COALESCE(SUM(ci.amount) FILTER (WHERE ci.is_billable = TRUE), 0) + 
         COALESCE(p.fixed_fee, 0)) - 
        COALESCE(p.budget_amount, 0)) / p.budget_amount) * 100
    ELSE 0
  END AS margin_pct,
  
  -- Additional useful metrics
  COALESCE(SUM(te.hours), 0) AS total_hours,
  p.budget_hours,
  p.budget_amount,
  
  -- Invoicing status
  COALESCE(SUM(te.amount) FILTER (WHERE te.invoiced = TRUE), 0) AS invoiced_labor,
  COALESCE(SUM(ci.amount) FILTER (WHERE ci.invoiced = TRUE), 0) AS invoiced_costs,
  
  p.created_at,
  p.updated_at

FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN time_entries te ON p.id = te.project_id
LEFT JOIN cost_items ci ON p.id = ci.project_id

GROUP BY 
  p.id, 
  p.name, 
  p.status, 
  c.name, 
  p.fixed_fee, 
  p.budget_amount, 
  p.budget_hours,
  p.created_at,
  p.updated_at;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_members_updated_at BEFORE UPDATE ON project_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rates_updated_at BEFORE UPDATE ON rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_items_updated_at BEFORE UPDATE ON cost_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGERS FOR AUTO-CALCULATIONS
-- ============================================================================

-- Function to calculate time entry amount
CREATE OR REPLACE FUNCTION calculate_time_entry_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hourly_rate IS NOT NULL THEN
    NEW.amount = NEW.hours * NEW.hourly_rate;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_time_entry_amount_trigger 
BEFORE INSERT OR UPDATE ON time_entries
FOR EACH ROW EXECUTE FUNCTION calculate_time_entry_amount();

-- Function to update task actual hours
CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks 
  SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0) 
    FROM time_entries 
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
  )
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_hours_on_insert
AFTER INSERT ON time_entries
FOR EACH ROW EXECUTE FUNCTION update_task_actual_hours();

CREATE TRIGGER update_task_hours_on_update
AFTER UPDATE ON time_entries
FOR EACH ROW EXECUTE FUNCTION update_task_actual_hours();

CREATE TRIGGER update_task_hours_on_delete
AFTER DELETE ON time_entries
FOR EACH ROW EXECUTE FUNCTION update_task_actual_hours();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE clients IS 'Client/customer information';
COMMENT ON TABLE projects IS 'Project master data with budgets and rates';
COMMENT ON TABLE project_members IS 'Team member assignments to projects';
COMMENT ON TABLE tasks IS 'Project tasks and subtasks';
COMMENT ON TABLE time_entries IS 'Time tracking entries';
COMMENT ON TABLE cost_items IS 'External costs, materials, and expenses';
COMMENT ON TABLE rates IS 'Hourly rates for users and projects';
COMMENT ON TABLE invoices IS 'Client invoices';
COMMENT ON VIEW project_finance_view IS 'Aggregated financial metrics per project';

