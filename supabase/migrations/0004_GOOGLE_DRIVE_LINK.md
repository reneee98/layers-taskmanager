# 🔗 Google Drive Link Migration

## Účel
Pridať `google_drive_link` stĺpec do `tasks` tabuľky pre ukladanie Google Drive odkazov.

## Migrácia: `0004_add_google_drive_link_to_tasks.sql`

### Čo robí:
1. ✅ Pridá `google_drive_link TEXT` do `tasks` tabuľky
2. ✅ Pridá dokumentačný komentár
3. ✅ Overí, že stĺpec bol pridaný

### Ako spustiť:

**Možnosť 1: Supabase Dashboard (odporúčané)**
```bash
# 1. Otvorte Supabase SQL Editor:
https://supabase.com/dashboard/project/ucwiuqpkogixqpnvgetl/sql

# 2. Skopírujte obsah supabase/migrations/0004_add_google_drive_link_to_tasks.sql

# 3. Vložte a spustite (RUN)
```

**Možnosť 2: Supabase CLI** (ak máte nainštalované)
```bash
supabase db push
```

### Verifikácia:
Po spustení by ste mali vidieť:
```
column_name      | data_type | is_nullable
-----------------|-----------|------------
google_drive_link| text      | YES
```

### Rollback (ak treba):
```sql
-- Odstrániť google_drive_link stĺpec
ALTER TABLE tasks DROP COLUMN IF EXISTS google_drive_link;
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
  order_index INTEGER DEFAULT 0,
  google_drive_link TEXT,        -- ← NOVÝ STĺPEC
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);
```

## Príklad použitia:

### Query s google_drive_link:
```sql
-- Získať úlohy s Google Drive linkmi
SELECT id, title, google_drive_link 
FROM tasks 
WHERE google_drive_link IS NOT NULL;
```

### Update Google Drive link:
```sql
-- Aktualizovať Google Drive link
UPDATE tasks 
SET google_drive_link = 'https://drive.google.com/drive/folders/...' 
WHERE id = 'task-id';
```

### API endpoint:
```typescript
// PATCH /api/tasks/[taskId]
{
  "google_drive_link": "https://drive.google.com/drive/folders/..."
}
```

## 🎯 Hotovo!
Po spustení migrácie bude možné ukladať Google Drive linky priamo do databázy! 🚀
