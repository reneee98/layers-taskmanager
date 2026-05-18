ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';

UPDATE tasks
SET currency = COALESCE(
  (
    SELECT p.currency
    FROM projects p
    WHERE p.id = tasks.project_id
  ),
  'EUR'
)
WHERE currency IS NULL OR currency = '';

COMMENT ON COLUMN tasks.currency IS 'Mena úlohy (EUR alebo USD)';
