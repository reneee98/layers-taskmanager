-- Add hourly_rate_cents column to projects table
ALTER TABLE projects ADD COLUMN hourly_rate_cents INTEGER;

-- Add comment
COMMENT ON COLUMN projects.hourly_rate_cents IS 'Hourly rate in cents for the project';
