# 🔑 Potrebujem Supabase Anon Key

## Problém
Aplikácia sa nenačítava, pretože chýba Supabase anon key v environment variables.

## Riešenie

### 1. Otvorte Supabase Dashboard
```
https://supabase.com/dashboard/project/ucwiuqpkogixqpnvgetl/settings/api
```

### 2. Skopírujte anon key
- V sekcii "Project API keys"
- Skopírujte "anon public" key
- Začína s `eyJ...`

### 3. Aktualizujte .env.local
```bash
# Otvorte .env.local súbor
nano .env.local

# Nahraďte YOUR_ANON_KEY_HERE skutočným kľúčom
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (skutočný kľúč)
```

### 4. Reštartujte server
```bash
npm run dev
```

## Príklad .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://ucwiuqpkogixqpnvgetl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
