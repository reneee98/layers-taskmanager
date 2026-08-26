-- Every task has its own persisted highlight color.
-- Existing tasks are backfilled and direct database inserts receive a random palette color.

UPDATE tasks
SET color = (
  ARRAY[
    '#6F83A8', '#6F91A3', '#698C92', '#688B82',
    '#738D73', '#879270', '#A08B68', '#A47D69',
    '#A36F70', '#9C7387', '#87779D', '#73799D'
  ]::TEXT[]
)[1 + FLOOR(RANDOM() * 12)::INTEGER]
WHERE color IS NULL;

ALTER TABLE tasks
  ALTER COLUMN color SET DEFAULT (
    ARRAY[
      '#6F83A8', '#6F91A3', '#698C92', '#688B82',
      '#738D73', '#879270', '#A08B68', '#A47D69',
      '#A36F70', '#9C7387', '#87779D', '#73799D'
    ]::TEXT[]
  )[1 + FLOOR(RANDOM() * 12)::INTEGER],
  ALTER COLUMN color SET NOT NULL;

COMMENT ON COLUMN tasks.color IS
  'Required task highlight color in HEX format #RRGGBB; randomly assigned when omitted';
