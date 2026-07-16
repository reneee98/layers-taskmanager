-- Add a persistent visual identity to projects.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS color TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_color_hex_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_color_hex_check
      CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

-- Give existing projects an evenly distributed, stable color.
UPDATE projects
SET color = (ARRAY[
  '#6F83A8', '#6F91A3', '#698C92', '#688B82',
  '#738D73', '#879270', '#A08B68', '#A47D69',
  '#A36F70', '#9C7387', '#87779D', '#73799D'
])[1 + ((('x' || substr(md5(id::text), 1, 8))::bit(32)::bigint % 12)::integer)]
WHERE color IS NULL;

COMMENT ON COLUMN projects.color IS
  'Project identity color used consistently across planning and task UI in HEX format #RRGGBB';
