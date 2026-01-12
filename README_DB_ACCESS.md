# Database Access & Migration Tools

Tento projekt obsahuje nástroje pre priame napojenie na databázu a spúšťanie migrácií.

## API Endpoints

### 1. `/api/db/migrate` - Spustenie migrácie

**POST** - Spustí migráciu alebo SQL príkaz

```json
{
  "migrationFile": "0077_add_is_extra_to_task_timers.sql"
}
```

alebo

```json
{
  "sql": "ALTER TABLE task_timers ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT false;"
}
```

**GET** - Zobrazí zoznam dostupných migrácií

### 2. `/api/db/create-table` - Vytvorenie tabuľky

**POST** - Vytvorí novú tabuľku

```json
{
  "tableName": "my_table",
  "columns": [
    "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
    "name TEXT NOT NULL",
    "created_at TIMESTAMPTZ DEFAULT NOW()"
  ]
}
```

alebo pomocou objektov:

```json
{
  "tableName": "my_table",
  "columns": [
    { "name": "id", "type": "UUID", "default": "gen_random_uuid()" },
    { "name": "name", "type": "TEXT", "nullable": false },
    { "name": "created_at", "type": "TIMESTAMPTZ", "default": "NOW()" }
  ]
}
```

alebo priamo SQL:

```json
{
  "sql": "CREATE TABLE IF NOT EXISTS my_table (id UUID PRIMARY KEY, name TEXT);"
}
```

## Požiadavky

### Možnosť 1: Použitie exec_sql funkcie (odporúčané)

1. Spusti migráciu `0078_create_exec_sql_function.sql` v Supabase dashboard
2. Táto funkcia umožní API endpointom spúšťať SQL príkazy

### Možnosť 2: Priame pripojenie cez pg

1. Nainštaluj pg knižnicu:
```bash
npm install pg @types/pg
```

2. Nastav `DATABASE_URL` alebo `SUPABASE_DB_URL` environment variable:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

## Environment Variables

Potrebné premenné prostredia:

- `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase projektu
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (pre RPC calls)
- `DATABASE_URL` alebo `SUPABASE_DB_URL` - Priame PostgreSQL connection string (pre pg library)

## Bezpečnosť

⚠️ **VAROVANIE**: Tieto endpointy umožňujú spúšťať ľubovoľné SQL príkazy. V produkcii by mali byť:
- Chránené autentifikáciou
- Obmedzené na admin používateľov
- Alebo úplne zakázané

Pre development je to v poriadku, ale v produkcii použite Supabase dashboard alebo migrácie.

## Príklady použitia

### Vytvorenie tabuľky cez API

```bash
curl -X POST http://localhost:3001/api/db/create-table \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "test_table",
    "columns": [
      "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
      "name TEXT NOT NULL",
      "created_at TIMESTAMPTZ DEFAULT NOW()"
    ]
  }'
```

### Spustenie migrácie

```bash
curl -X POST http://localhost:3001/api/db/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "migrationFile": "0077_add_is_extra_to_task_timers.sql"
  }'
```

### Spustenie SQL príkazu

```bash
curl -X POST http://localhost:3001/api/db/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "ALTER TABLE task_timers ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT false;"
  }'
```


