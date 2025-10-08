# Seed Data Instructions

## Ako načítať dummy dáta do databázy

### Možnosť 1: Pomocou Supabase CLI (Odporúčané pre lokálny vývoj)

```bash
# Spustite lokálnu Supabase inštanciu
supabase start

# Načítajte seed data
supabase db reset --seed

# Alebo manuálne
psql $DATABASE_URL -f supabase/seed.sql
```

### Možnosť 2: Pomocou Supabase Dashboard (Pre produkciu/staging)

1. Otvorte Supabase Dashboard
2. Prejdite do sekcie **SQL Editor**
3. Vytvorte nový query
4. Skopírujte obsah súboru `supabase/seed.sql`
5. Vložte do editora a spustite (Run)

### Možnosť 3: Pomocou psql (Priame pripojenie)

```bash
# Pripojte sa k databáze
psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres"

# Načítajte seed súbor
\i supabase/seed.sql

# Alebo jednoduchšie
psql [YOUR-CONNECTION-STRING] -f supabase/seed.sql
```

## Čo obsahujú dummy dáta?

### 📊 **3 Klienti:**
1. **Acme Corporation** - IT projekty
2. **TechStart s.r.o.** - AI startup
3. **Global Solutions** - Medzinárodná firma

### 📁 **4 Projekty:**
1. **E-commerce Platform** (ECOM-2024)
   - Status: Active
   - Budget: 50,000 €
   - 500 hodín

2. **AI Chatbot Integration** (AI-BOT-001)
   - Status: In Progress
   - Budget: 25,000 €
   - 200 hodín

3. **Mobile App Redesign** (MOBILE-2024)
   - Status: Draft
   - Budget: 35,000 €
   - 300 hodín

4. **Data Analytics Dashboard** (DASH-2024)
   - Status: Completed
   - Budget: 18,000 €
   - 150 hodín

### ✅ **15 Úloh:**
- **E-commerce Platform:** 9 úloh (vrátane pod-úloh)
  - Frontend Development (3 sub-tasks)
  - Backend API (2 sub-tasks)
  - Database Design
  - Testing & QA

- **AI Chatbot Integration:** 3 úlohy
  - OpenAI Integration
  - Chat UI Component
  - Context Management

- **Mobile App Redesign:** 3 úlohy
  - UI/UX Design
  - iOS Implementation
  - Android Implementation

### ⏰ **5 Časových záznamov:**
- Rôzne úlohy s odpracovanými hodinami
- Automaticky aktualizuje `actual_hours` v tasks

### 💰 **3 Nákladové položky:**
- Stripe Monthly Fee (49 €)
- AWS Hosting (125 €)
- OpenAI API Credits (200 €)

## Overenie načítania dát

```sql
-- Počet záznamov
SELECT 'Clients' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects
UNION ALL
SELECT 'Tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'Time Entries', COUNT(*) FROM time_entries
UNION ALL
SELECT 'Cost Items', COUNT(*) FROM cost_items;

-- Projekty s počtom úloh
SELECT 
  p.name,
  p.code,
  p.status,
  COUNT(t.id) as task_count
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name, p.code, p.status
ORDER BY p.created_at;

-- Úlohy s odpracovanými hodinami
SELECT 
  t.title,
  t.status,
  t.estimated_hours,
  t.actual_hours,
  p.name as project_name
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.parent_task_id IS NULL
ORDER BY p.name, t.order_index;
```

## Vyčistenie testovacích dát

Ak chcete odstrániť všetky dummy dáta:

```sql
-- POZOR: Toto zmaže všetky dáta!
DELETE FROM time_entries;
DELETE FROM cost_items;
DELETE FROM tasks;
DELETE FROM project_members;
DELETE FROM projects;
DELETE FROM clients;
```

## Poznámky

- UUID pre dummy dáta sú fixné (napr. `11111111-1111-1111-1111-111111111111`) pre ľahšie testovanie
- `ON CONFLICT (id) DO NOTHING` zabezpečuje, že sa dáta nepridajú duplicitne
- Časové záznamy automaticky aktualizujú `actual_hours` v tasks cez databázový trigger
- Všetky projekty majú nastavený `fee_markup_pct` pre testovanie tejto funkcie

