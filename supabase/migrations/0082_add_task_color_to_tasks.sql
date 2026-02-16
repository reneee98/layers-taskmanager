-- Add optional HEX color highlight for tasks

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS color TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_color_hex_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_color_hex_check
      CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

COMMENT ON COLUMN tasks.color IS
  'Optional highlight color for task UI in HEX format #RRGGBB';
