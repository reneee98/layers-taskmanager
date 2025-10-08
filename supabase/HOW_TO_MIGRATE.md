# 🚀 Supabase Migrácie - Kompletný Návod

## 📋 Prehľad Migrácií

```
supabase/migrations/
├── 0001_init.sql              → Základná schéma (tables, enums, views)
├── 0002_rls.sql               → Row Level Security politiky
└── 0003_add_order_index_to_tasks.sql → Pridať order_index pre drag&drop
```

## 🎯 Prvotné Nastavenie (Clean Install)

### 1️⃣ Otvorte Supabase SQL Editor
```
https://supabase.com/dashboard/project/ucwiuqpkogixqpnvgetl/sql
```

### 2️⃣ Spustite migrácie v PORADÍ:

**Krok 1: Základná schéma**
```sql
-- Skopírujte celý obsah: supabase/migrations/0001_init.sql
-- Vložte do SQL editora a spustite RUN
```

**Krok 2: Row Level Security**
```sql
-- Skopírujte celý obsah: supabase/migrations/0002_rls.sql
-- Vložte do SQL editora a spustite RUN
```

**Krok 3: Order Index (pre TaskTable drag&drop)**
```sql
-- Skopírujte celý obsah: supabase/migrations/0003_add_order_index_to_tasks.sql
-- Vložte do SQL editora a spustite RUN
```

### 3️⃣ VYPNITE RLS (pre vývoj)

```sql
-- DÔLEŽITÉ: RLS blokuje INSERT/UPDATE bez autentifikácie
-- Pre vývoj VYPNITE RLS:

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE rates DISABLE ROW LEVEL SECURITY;
```

### 4️⃣ Vložte Dummy Data

```sql
-- Skopírujte celý obsah: supabase/insert_dummy_data.sql
-- Vložte do SQL editora a spustite RUN
```

### 5️⃣ Verifikácia

```sql
-- Skontrolujte, či máte dáta:
SELECT 
  'Clients' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects
UNION ALL
SELECT 'Tasks', COUNT(*) FROM tasks;

-- Očakávaný výsledok:
-- Clients  | 3
-- Projects | 3
-- Tasks    | 6
```

---

## 🔄 Pridávanie Novej Migrácie

Ak už máte databázu a chcete pridať **LEN** `order_index`:

### Rýchly postup:

**1. Otvorte SQL Editor**

**2. Skopírujte a spustite:**
```sql
-- supabase/migrations/0003_add_order_index_to_tasks.sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON tasks(project_id, order_index);

-- Prečíslovať existujúce úlohy
WITH numbered_tasks AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 AS new_order
  FROM tasks
)
UPDATE tasks
SET order_index = numbered_tasks.new_order
FROM numbered_tasks
WHERE tasks.id = numbered_tasks.id;

-- Verifikácia
SELECT id, title, order_index FROM tasks ORDER BY project_id, order_index;
```

---

## 🧪 Testovanie

### Test 1: Načítanie dát z API
```bash
# V termináli:
curl http://localhost:3000/api/clients | json_pp
curl http://localhost:3000/api/projects | json_pp
curl http://localhost:3000/api/tasks | json_pp
```

### Test 2: Order Index
```sql
-- Overiť, že order_index existuje:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'order_index';

-- Očakávaný výsledok:
-- column_name  | data_type | column_default
-- order_index  | integer   | 0
```

### Test 3: Drag & Drop Reorder
```bash
# POST request na reorder endpoint:
curl -X POST http://localhost:3000/api/tasks/reorder \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"id": "task-1-id", "order_index": 0},
      {"id": "task-2-id", "order_index": 1}
    ]
  }'
```

---

## 🐛 Troubleshooting

### Problém: "column order_index does not exist"
**Riešenie:** Spustite migráciu `0003_add_order_index_to_tasks.sql`

### Problém: "permission denied" alebo "new row violates RLS"
**Riešenie:** Vypnite RLS (viď krok 3️⃣)

### Problém: Dummy data sa nevložia
**Riešenie:** 
1. Skontrolujte, či máte vypnuté RLS
2. Skontrolujte, či existujú foreign key tabuľky (clients → projects → tasks)
3. Vyčistite tabuľky a skúste znova:
```sql
DELETE FROM tasks;
DELETE FROM projects;
DELETE FROM clients;
-- Potom znova spustite insert_dummy_data.sql
```

### Problém: "UUID invalid"
**Riešenie:** Nepoužívajte vlastné UUID stringy, nechajte databázu generovať:
```sql
-- ❌ ZLE
INSERT INTO tasks (id, ...) VALUES ('task-001', ...);

-- ✅ SPRÁVNE
INSERT INTO tasks (project_id, title, ...) VALUES (...);
-- ID sa vygeneruje automaticky
```

---

## 🔙 Rollback (Zrušenie Migrácií)

### Odstrániť order_index:
```sql
ALTER TABLE tasks DROP COLUMN IF EXISTS order_index;
DROP INDEX IF EXISTS idx_tasks_order_index;
```

### Vymazať všetko (RESET):
```sql
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS cost_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS rates CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
```

---

## ✅ Checklist pre Production

Pred nasadením do produkcie:

- [ ] Všetky migrácie úspešne spustené
- [ ] RLS **ZAPNUTÉ** na všetkých tabuľkách
- [ ] Autentifikácia nakonfigurovaná (Supabase Auth)
- [ ] `project_members` tabuľka naplnená (user roles)
- [ ] Test RLS politík (`supabase/tests/test_rls_policies.sql`)
- [ ] Dummy data vymazané (production používa reálne dáta)
- [ ] Environment variables nastavené (`.env.production`)
- [ ] API rate limiting nakonfigurovaný
- [ ] Database backups zapnuté

---

## 📚 Súvisiace Súbory

- `MIGRATION_TASKS.md` - Detail o 0003 migrácii
- `RLS_DOCUMENTATION.md` - Dokumentácia RLS politík
- `SEED_INSTRUCTIONS.md` - Inštrukcie pre seed.sql (veľký dataset)
- `insert_dummy_data.sql` - Malé dummy data (3 klienti, 3 projekty, 6 úloh)

---

## 🎯 Hotovo!

Po dokončení týchto krokov by mal váš Supabase projekt fungovať s:
- ✅ Všetky tabuľky vytvorené
- ✅ Order index pre drag&drop
- ✅ Dummy data načítané
- ✅ Next.js aplikácia pripojená

**Spustite aplikáciu:**
```bash
npm run dev
```

**Otvorte:**
- http://localhost:3000/clients
- http://localhost:3000/projects
- http://localhost:3000/tasks (s drag&drop!)

