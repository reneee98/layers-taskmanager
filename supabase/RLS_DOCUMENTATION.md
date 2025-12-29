# Row Level Security (RLS) - Dokumentácia

## Prehľad

Databáza používa Row Level Security (RLS) na zabezpečenie role-based access control (RBAC). Každý používateľ má prístup len k dátam na základe svojej role v projekte.

## Role

### 1. Owner / Manager
**Práva:** Plný CRUD prístup (Create, Read, Update, Delete)

**Môže:**
- ✅ Vytvárať, upravovať a mazať projekty
- ✅ Spravovať členov tímu (pridávať/odstraňovať)
- ✅ Vytvárať, upravovať a mazať všetky úlohy
- ✅ Spravovať hodinové sadzby
- ✅ Vytvárať, upravovať a mazať všetky časové záznamy
- ✅ Spravovať náklady a faktúry
- ✅ Vidieť všetky finančné údaje vrátane sadzieb

**Nemôže:**
- ❌ Prístup k projektom, kde nie je owner/manager

### 2. Member
**Práva:** Čiastočný CRUD prístup

**Môže:**
- ✅ Čítať projekty (len projekty, kde je členom)
- ✅ Vytvárať úlohy v projekte
- ✅ Upravovať a mazať vlastné úlohy
- ✅ Upravovať úlohy, kde je priradený (assigned_to)
- ✅ Vytvárať vlastné časové záznamy
- ✅ Upravovať a mazať vlastné časové záznamy
- ✅ Vytvárať náklady
- ✅ Upravovať a mazať vlastné náklady
- ✅ Vidieť hodinové sadzby
- ✅ Čítať faktúry

**Nemôže:**
- ❌ Upravovať projekt
- ❌ Spravovať členov tímu
- ❌ Upravovať/mazať úlohy iných (okrem assigned)
- ❌ Upravovať/mazať časové záznamy iných
- ❌ Vytvárať faktúry

### 3. Client Viewer
**Práva:** Len čítanie (read-only) s obmedzenými poľami

**Môže:**
- ✅ Čítať základné info o projekte (názov, popis, status, dátumy)
- ✅ Čítať úlohy (bez interných poznámok)
- ✅ Čítať náklady
- ✅ Čítať faktúry
- ✅ Používať špeciálne views bez sadzieb

**Nemôže:**
- ❌ Vytvárať, upravovať alebo mazať čokoľvek
- ❌ Vidieť hodinové sadzby
- ❌ Vidieť rozpočty
- ❌ Vidieť časové záznamy s cenami (len hodiny)
- ❌ Prístup k tabuľke `rates`

## Pomocné funkcie

### `get_user_project_role(project_id, user_id)`
Vracia rolu používateľa v projekte.

```sql
SELECT get_user_project_role(
  '123e4567-e89b-12d3-a456-426614174000',
  auth.uid()
);
-- Returns: 'owner', 'manager', 'member', 'client_viewer', or NULL
```

### `is_project_owner_or_manager(project_id, user_id)`
Kontroluje, či je používateľ owner alebo manager.

```sql
SELECT is_project_owner_or_manager(
  '123e4567-e89b-12d3-a456-426614174000',
  auth.uid()
);
-- Returns: true/false
```

### `is_project_member(project_id, user_id)`
Kontroluje, či je používateľ členom projektu (akákoľvek rola).

```sql
SELECT is_project_member(
  '123e4567-e89b-12d3-a456-426614174000',
  auth.uid()
);
-- Returns: true/false
```

### `is_client_viewer(project_id, user_id)`
Kontroluje, či má používateľ rolu client_viewer.

```sql
SELECT is_client_viewer(
  '123e4567-e89b-12d3-a456-426614174000',
  auth.uid()
);
-- Returns: true/false
```

## Špeciálne views pre Client Viewer

### `client_project_view`
Bezpečný pohľad na projekty bez sadzieb a rozpočtov.

**Dostupné stĺpce:**
- `id`, `name`, `description`
- `status`, `start_date`, `end_date`
- `client_name`, `client_email`

**Skryté:**
- `budget_hours`, `budget_amount`
- `hourly_rate`, `fixed_fee`
- `external_costs_budget`

```sql
-- Client viewer používa tento view namiesto priameho prístupu
SELECT * FROM client_project_view;
```

### `client_time_entries_view`
Časové záznamy bez sadzieb a cien.

**Dostupné stĺpce:**
- `id`, `project_id`, `task_id`
- `date`, `hours`, `description`
- `is_billable`, `task_title`

**Skryté:**
- `hourly_rate`, `amount`
- `user_id`, `invoice_id`

```sql
SELECT * FROM client_time_entries_view;
```

### `client_tasks_view`
Úlohy bez interných informácií.

**Dostupné stĺpce:**
- `id`, `project_id`
- `title`, `description`
- `status`, `priority`
- `due_date`, `completed_at`

**Skryté:**
- `assigned_to`, `created_by`
- `estimated_hours`, `actual_hours`

```sql
SELECT * FROM client_tasks_view;
```

## Príklady použitia

### Owner pridáva nového člena

```sql
-- Owner môže pridať nového člena
INSERT INTO project_members (project_id, user_id, role, hourly_rate)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'user-uuid-here',
  'member',
  85.00
);
```

### Member zaznamenáva čas

```sql
-- Member môže zaznamenať vlastný čas
INSERT INTO time_entries (
  project_id,
  task_id,
  user_id,
  date,
  hours,
  description,
  hourly_rate
)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'task-uuid',
  auth.uid(),  -- Musí byť vlastné ID
  CURRENT_DATE,
  8.000,
  'Development work',
  80.00
);
```

### Member aktualizuje priradenú úlohu

```sql
-- Member môže aktualizovať úlohu, kde je assigned_to
UPDATE tasks
SET status = 'done', completed_at = NOW()
WHERE id = 'task-uuid'
  AND assigned_to = auth.uid();
```

### Client viewer prezerá projekt

```sql
-- Client viewer používa bezpečný view
SELECT 
  name,
  description,
  status,
  start_date,
  end_date,
  client_name
FROM client_project_view
WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- Pokus o priamy prístup k rozpočtu zlyhá
SELECT budget_amount FROM projects 
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
-- Vráti 0 riadkov (RLS blokuje)
```

## Testovanie RLS

Spustiť test skript:

```bash
# Lokálne Supabase
supabase db reset
psql $DATABASE_URL -f supabase/tests/test_rls_policies.sql
```

Test skript vytvorí:
- 3 testovacích používateľov (owner, member, client_viewer)
- Testovací projekt s údajmi
- Overí všetky SELECT, INSERT, UPDATE, DELETE operácie
- Kontroluje cross-project access denial

**Očakávaný výstup:**
```
✓ Owner: Full CRUD success
✓ Member: CRUD own data success, project updates denied
✓ Client_viewer: Read-only success, rates hidden
✓ Cross-project: Access denied correctly
```

## Bezpečnostné poznámky

1. **Auth.uid()** - Všetky policies používajú `auth.uid()` na identifikáciu aktuálneho používateľa
2. **SECURITY DEFINER** - Helper funkcie používajú SECURITY DEFINER pre konzistentné kontroly
3. **Left_at check** - Policies kontrolujú `left_at IS NULL OR left_at > NOW()` pre aktívnych členov
4. **Cascade delete** - Pri odstránení člena z projektu sa neodstránia jeho dáta, len sa stratí prístup
5. **Service role bypass** - Service role key obchádza RLS (používať len v backend kóde)

## Údržba

### Pridanie novej role

1. Aktualizovať helper funkcie
2. Pridať nové policies pre každú tabuľku
3. Vytvoriť špeciálne views ak potrebné
4. Aktualizovať testy
5. Aktualizovať dokumentáciu

### Zmena prístupových práv

1. Upraviť existujúce policies
2. Otestovať všetky prípady použitia
3. Spustiť test skript
4. Aktualizovať dokumentáciu

