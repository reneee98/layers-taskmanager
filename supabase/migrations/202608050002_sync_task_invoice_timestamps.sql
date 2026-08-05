ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('done', 'invoiced') AND NEW.completed_at IS NULL THEN
      NEW.completed_at = NOW();
    END IF;

    IF NEW.status = 'invoiced' AND NEW.invoiced_at IS NULL THEN
      NEW.invoiced_at = NOW();
    END IF;

    RETURN NEW;
  END IF;

  -- Invoiced tasks remain completed; moving done -> invoiced must not erase completed_at.
  IF NEW.status IN ('done', 'invoiced')
    AND OLD.status NOT IN ('done', 'invoiced')
    AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;

  IF NEW.status NOT IN ('done', 'invoiced')
    AND OLD.status IN ('done', 'invoiced') THEN
    NEW.completed_at = NULL;
  END IF;

  IF NEW.status = 'invoiced'
    AND OLD.status IS DISTINCT FROM 'invoiced'
    AND NEW.invoiced_at IS NULL THEN
    NEW.invoiced_at = NOW();
  END IF;

  IF NEW.status <> 'invoiced'
    AND OLD.status = 'invoiced' THEN
    NEW.invoiced_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_completed_at ON tasks;

CREATE TRIGGER trigger_set_completed_at
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();

COMMENT ON TRIGGER trigger_set_completed_at ON tasks IS
  'Synchronizes completed_at and invoiced_at with done/invoiced task statuses';
