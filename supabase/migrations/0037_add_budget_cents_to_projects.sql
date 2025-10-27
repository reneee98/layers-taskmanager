-- Add budget_cents column to projects table
ALTER TABLE projects ADD COLUMN budget_cents INTEGER;

-- Add comment
COMMENT ON COLUMN projects.budget_cents IS 'Budget/fixed fee in cents for the project';

