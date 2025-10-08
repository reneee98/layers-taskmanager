# 📚 Návod na migráciu databázy

## ✅ Stav: Pripojenie funguje!

Vaša Supabase databáza je pripojená, ale chýbajú tabuľky. Potrebujete spustiť migrácie.

## 🎯 Najjednoduchší spôsob: Supabase Dashboard (ODPORÚČANÉ)

### 1. Otvorte SQL Editor

Prejdite na: **https://supabase.com/dashboard/project/ucwiuqpkogixqpnvgetl/sql**

Alebo:
- Otvorte [Supabase Dashboard](https://supabase.com/dashboard)
- Vyberte projekt **ucwiuqpkogixqpnvgetl**
- V ľavom menu kliknite na **SQL Editor**

### 2. Spustite migrácie v poradí:

#### ✅ Krok 1: Základná schéma (tabuľky, indexy, views)

1. Kliknite **+ New query**
2. Otvorte súbor: `supabase/migrations/0001_init.sql`
3. Skopírujte **celý obsah** (Ctrl+A, Ctrl+C)
4. Vložte do SQL editora (Ctrl+V)
5. Kliknite **Run** (alebo Ctrl+Enter)
6. Počkajte ~5-10 sekúnd
7. Měli by ste vidieť: `Success. No rows returned`

#### ✅ Krok 2: Row Level Security (RLS)

1. Kliknite **+ New query** (nový query)
2. Otvorte súbor: `supabase/migrations/0002_rls.sql`
3. Skopírujte celý obsah
4. Vložte do editora
5. Kliknite **Run**
6. Počkajte ~3-5 sekúnd

#### ✅ Krok 3: Dummy dáta (seed)

1. Kliknite **+ New query**
2. Otvorte súbor: `supabase/seed.sql`
3. Skopírujte celý obsah
4. Vložte do editora
5. Kliknite **Run**
6. Mali by ste vidieť tabuľku s počtami:
   - clients: 3
   - projects: 4
   - tasks: 15
   - atď.

### 3. Overte tabuľky

1. V ľavom menu kliknite **Table Editor**
2. Mali by ste vidieť tieto tabuľky:
   - clients
   - projects
   - tasks
   - time_entries
   - cost_items
   - invoices
   - project_members
   - rates

### 4. Reštartujte Next.js

```bash
# Zastavte server (Ctrl+C)
npm run dev
```

### 5. Otvorte aplikáciu

```bash
http://localhost:3000
```

**Hotovo!** Mali by ste vidieť dáta z Supabase! 🎉

---

## 🔧 Alternatíva: psql (pre pokročilých)

Ak máte nainštalované `psql`:

### 1. Získajte connection string

V Supabase Dashboard:
- Settings → Database → Connection string → **URI**
- Skopírujte celý string (začína `postgresql://postgres...`)
- Nahraďte `[YOUR-PASSWORD]` vaším DB heslom

### 2. Spustite migrácie

```bash
# Základná schéma
psql 'postgresql://postgres:[PASSWORD]@db.ucwiuqpkogixqpnvgetl.supabase.co:5432/postgres' \
  -f supabase/migrations/0001_init.sql

# RLS
psql 'postgresql://postgres:[PASSWORD]@db.ucwiuqpkogixqpnvgetl.supabase.co:5432/postgres' \
  -f supabase/migrations/0002_rls.sql

# Seed data
psql 'postgresql://postgres:[PASSWORD]@db.ucwiuqpkogixqpnvgetl.supabase.co:5432/postgres' \
  -f supabase/seed.sql
```

---

## 🐛 Troubleshooting

### "relation already exists"
- Tabuľky už existujú, môžete preskočiť 0001_init.sql
- Alebo vymažte všetky tabuľky a spustite znova

### "syntax error"
- Skontrolujte či ste skopírovali celý súbor
- Niekedy Supabase nepodporuje multiline komentáre `/* */`

### "permission denied"
- Používate anon key namiesto service_role key
- Pre migrácie použite Supabase Dashboard (má vyššie oprávnenia)

### Stále prázdne dáta v aplikácii
```bash
# Skontrolujte .env.local
cat .env.local

# Malo by byť:
# NEXT_PUBLIC_USE_MOCK_DATA=false
# NEXT_PUBLIC_SUPABASE_URL=https://ucwiuqpkogixqpnvgetl.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Reštartujte server
npm run dev
```

---

## 📊 Overenie úspešnej migrácie

V SQL Editore spustite:

```sql
-- Zoznam tabuliek
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Počty záznamov
SELECT 
  'clients' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'time_entries', COUNT(*) FROM time_entries;
```

Výsledok by mal byť:
- clients: 3
- projects: 4
- tasks: 15
- time_entries: 5

---

## ✨ Po úspešnej migrácii

Vaša aplikácia teraz funguje s live Supabase databázou!

Môžete:
- ✅ Vytvárať klientov, projekty, úlohy
- ✅ Upravovať a mazať záznamy
- ✅ Používať filtrovanie a vyhľadávanie
- ✅ Inline editing (status, fee markup)
- ✅ Vytvárať pod-úlohy

Všetko sa ukladá do Supabase a zdieľa sa medzi zariadeniami! 🚀

