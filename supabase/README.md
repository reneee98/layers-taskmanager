# Databázová schéma - Layers Task Manager

## Prehľad

Táto databáza obsahuje kompletný systém na správu projektov, úloh, časových záznamov a fakturácie.

## Enums

### project_status
- `draft` - Návrh
- `active` - Aktívny
- `on_hold` - Pozastavený
- `completed` - Dokončený
- `cancelled` - Zrušený

### task_status
- `todo` - Na spraovanie
- `in_progress` - Prebieha
- `review` - Na kontrolu
- `done` - Hotovo
- `cancelled` - Zrušené

### task_priority
- `low` - Nízka
- `medium` - Stredná
- `high` - Vysoká
- `urgent` - Naliehavá

## Tabuľky

### clients
Informácie o klientoch/zákazníkoch.

**Stĺpce:**
- `id` - UUID, primárny kľúč
- `name` - Názov klienta
- `email` - Email
- `phone` - Telefón
- `address` - Adresa
- `tax_id` - IČO/DIČ
- `notes` - Poznámky
- `created_at`, `updated_at` - Časové pečiatky

### projects
Hlavné údaje o projektoch vrátane rozpočtov a sadzieb.

**Stĺpce:**
- `id` - UUID, primárny kľúč
- `client_id` - FK na clients
- `name` - Názov projektu
- `description` - Popis
- `status` - Stav projektu (enum)
- `start_date`, `end_date` - Dátumy
- `budget_hours` - Rozpočet hodín (3 desatinné)
- `budget_amount` - Rozpočet v €
- `hourly_rate` - Hodinová sadzba
- `fixed_fee` - Fixný poplatok
- `external_costs_budget` - Rozpočet externých nákladov
- `created_by` - UUID používateľa

### project_members
Priradenie členov tímu k projektom.

**Stĺpce:**
- `id` - UUID
- `project_id` - FK na projects
- `user_id` - UUID používateľa
- `role` - Rola v projekte
- `hourly_rate` - Individuálna hodinová sadzba
- `joined_at`, `left_at` - Dátumy členstva

### tasks
Úlohy a podúlohy.

**Stĺpce:**
- `id` - UUID
- `project_id` - FK na projects
- `parent_task_id` - FK na tasks (pre podúlohy)
- `title` - Názov úlohy
- `description` - Popis
- `status` - Stav (enum)
- `priority` - Priorita (enum)
- `assigned_to` - UUID priradeného používateľa
- `estimated_hours` - Odhadované hodiny (3 desatinné)
- `actual_hours` - Skutočné hodiny (auto-počítané)
- `due_date` - Termín
- `completed_at` - Dátum dokončenia

### rates
Rôzne typy hodinových sadzieb.

**Stĺpce:**
- `id` - UUID
- `project_id` - FK na projects (voliteľné)
- `user_id` - UUID používateľa (voliteľné)
- `name` - Názov sadzby
- `hourly_rate` - Hodinová sadzba
- `valid_from`, `valid_to` - Platnosť
- `is_default` - Výchozí sadzba

### time_entries
Záznamy odpracovaného času.

**Stĺpce:**
- `id` - UUID
- `project_id` - FK na projects
- `task_id` - FK na tasks
- `user_id` - UUID používateľa
- `date` - Dátum
- `hours` - Hodiny (3 desatinné)
- `description` - Popis práce
- `is_billable` - Účtovateľné
- `hourly_rate` - Hodinová sadzba
- `amount` - Suma (auto-počítaná)
- `invoiced` - Fakturované
- `invoice_id` - FK na invoices

**Triggery:**
- Automatický výpočet `amount` z `hours * hourly_rate`
- Aktualizácia `actual_hours` v úlohe

### cost_items
Externé náklady, materiály, výdavky.

**Stĺpce:**
- `id` - UUID
- `project_id` - FK na projects
- `task_id` - FK na tasks
- `name` - Názov položky
- `description` - Popis
- `category` - Kategória
- `amount` - Suma
- `date` - Dátum
- `is_billable` - Účtovateľné
- `invoiced` - Fakturované
- `invoice_id` - FK na invoices
- `receipt_url` - URL účtenky

### invoices
Faktúry pre klientov.

**Stĺpce:**
- `id` - UUID
- `project_id` - FK na projects
- `client_id` - FK na clients
- `invoice_number` - Číslo faktúry (unique)
- `issue_date` - Dátum vystavenia
- `due_date` - Splatnosť
- `subtotal` - Medzisúčet
- `tax_rate` - Sadzba DPH (%)
- `tax_amount` - Suma DPH
- `total_amount` - Celková suma
- `paid_amount` - Uhradená suma
- `status` - Stav faktúry

## Views

### project_finance_view
Agregované finančné metriky pre každý projekt.

**Stĺpce:**
- `project_id` - ID projektu
- `project_name` - Názov projektu
- `project_status` - Stav projektu
- `client_name` - Názov klienta
- `billable_hours` - Účtovateľné hodiny
- `labor_cost` - Náklady na prácu
- `external_cost` - Externé náklady
- `fee_amount` - Fixný poplatok
- `total_price` - Celková cena (labor + external + fee)
- `margin` - Marža (total_price - budget_amount)
- `margin_pct` - Marža v % ((total_price - budget) / budget * 100)
- `total_hours` - Celkové hodiny
- `budget_hours` - Rozpočtované hodiny
- `budget_amount` - Rozpočtová suma
- `invoiced_labor` - Fakturovaná práca
- `invoiced_costs` - Fakturované náklady

## Indexy

Vytvorené indexy pre:
- Všetky cudzie kľúče (FK)
- Stĺpce používané na vyhľadávanie (name, email, status, priority)
- Dátumové stĺpce (date, start_date, end_date, due_date)
- Stĺpce používané na filtrovanie (is_billable, invoiced, category)

## Automatické aktualizácie

### Trigger: updated_at
Všetky tabuľky s `updated_at` automaticky aktualizujú tento stĺpec pri UPDATE.

### Trigger: calculate_time_entry_amount
Pri INSERT/UPDATE time_entries sa automaticky vypočíta `amount = hours * hourly_rate`.

### Trigger: update_task_actual_hours
Pri INSERT/UPDATE/DELETE time_entries sa automaticky aktualizuje `actual_hours` v úlohe.

## Použitie

### Pripojenie k Supabase

```bash
# Inicializovať Supabase projekt
supabase init

# Spustiť lokálne
supabase start

# Aplikovať migrácie
supabase db reset
```

### Query príklady

```sql
-- Finančný prehľad projektov
SELECT * FROM project_finance_view WHERE project_status = 'active';

-- Neúčtované hodiny
SELECT * FROM time_entries WHERE is_billable = true AND invoiced = false;

-- Úlohy po termíne
SELECT * FROM tasks 
WHERE status != 'done' 
  AND due_date < CURRENT_DATE
ORDER BY priority DESC, due_date ASC;
```

## Bezpečnosť (RLS)

Pre produkčné použitie je potrebné pridať Row Level Security (RLS) politiky pre každú tabuľku podľa požiadaviek aplikácie.

Príklad:
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = projects.id
    )
  );
```

