# 🔧 Tasks Migration - Add order_index

## Účel
Pridať `order_index` stĺpec do tabuľky `tasks` pre drag & drop funkcionalitu.

## Migrácia: `0003_add_order_index_to_tasks.sql`

### Čo robí:
1. ✅ Pridá `order_index INTEGER DEFAULT 0` do `tasks` tabuľky
2. ✅ Vytvorí index `idx_tasks_order_index` pre rýchle triedenie
3. ✅ Automaticky prečísluje existujúce úlohy (0, 1, 2, ...) podľa `created_at`
4. ✅ Pridá comment pre dokumentáciu

### Ako spustiť:

**Možnosť 1: Supabase Dashboard (odporúčané)**
```bash
# 1. Otvorte Supabase SQL Editor:
https://supabase.com/dashboard/project/ucwiuqpkogixqpnvgetl/sql

# 2. Skopírujte obsah supabase/migrations/0003_add_order_index_to_tasks.sql

# 3. Vložte a spustite (RUN)
```

**Možnosť 2: Supabase CLI** (ak máte nainštalované)
```bash
supabase db push
```

**Možnosť 3: Manuálne cez psql**
```bash
psql -h db.ucwiuqpkogixqpnvgetl.supabase.co \
     -U postgres \
     -d postgres \
     -f supabase/migrations/0003_add_order_index_to_tasks.sql
```

### Verifikácia:
Po spustení by ste mali vidieť:
```
status              | total_tasks | projects_with_tasks
--------------------|-------------|--------------------
Migration complete! |      6      |          3
```

### Rollback (ak treba):
```sql
-- Odstrániť order_index stĺpec
ALTER TABLE tasks DROP COLUMN IF EXISTS order_index;

-- Odstrániť index
DROP INDEX IF EXISTS idx_tasks_order_index;
```

## Štruktúra tabuľky po migrácii:

```sql
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
  order_index INTEGER DEFAULT 0,        -- ← NOVÝ STĹPEC
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Nový index pre rýchle triedenie
CREATE INDEX idx_tasks_order_index ON tasks(project_id, order_index);
```

## Príklad použitia:

### Query s order_index:
```sql
-- Získať úlohy v správnom poradí
SELECT * FROM tasks 
WHERE project_id = 'xxx'
ORDER BY order_index ASC;
```

### Reorder úlohy (drag & drop):
```sql
-- Presunúť úlohu na pozíciu 2
UPDATE tasks 
SET order_index = 2 
WHERE id = 'task-id';

-- Posunúť ostatné úlohy
UPDATE tasks 
SET order_index = order_index + 1 
WHERE project_id = 'xxx' 
  AND order_index >= 2 
  AND id != 'task-id';
```

### Batch reorder (API endpoint):
```typescript
// POST /api/tasks/reorder
{
  "tasks": [
    { "id": "task-1", "order_index": 0 },
    { "id": "task-2", "order_index": 1 },
    { "id": "task-3", "order_index": 2 }
  ]
}
```

## 🎯 Hotovo!
Po spustení migrácie by TaskTable mal mať plne funkčný drag & drop! 🚀

