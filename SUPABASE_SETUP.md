# Supabase Setup - Pripojenie k live databáze

## 📋 Kroky na pripojenie k Supabase

### 1. Vytvorte Supabase projekt

1. Prejdite na [supabase.com](https://supabase.com)
2. Kliknite na **"Start your project"** alebo **"New Project"**
3. Prihláste sa (GitHub/Google/Email)
4. Vytvorte novú organizáciu (ak nemáte)
5. Vytvorte nový projekt:
   - **Project Name**: `layers-task-manager` (alebo podľa výberu)
   - **Database Password**: Vygenerujte silné heslo a **uložte si ho!**
   - **Region**: Vyberte najbližší (napr. Frankfurt, Germany)
   - **Pricing Plan**: Free (postačuje na vývoj)
6. Počkajte ~2 minúty kým sa projekt vytvorí

### 2. Získajte API kľúče

Po vytvorení projektu:

1. V ľavom menu kliknite na **Settings** (⚙️)
2. Kliknite na **API**
3. Skopírujte:
   - **Project URL** (napr. `https://xxxxx.supabase.co`)
   - **anon public** kľúč (dlhý string začínajúci `eyJ...`)

### 3. Nastavte ENV premenné

Vytvorte/upravte súbor `.env.local` v root priečinku:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...váš-anon-key

# Mock Mode (nastavte na false pre použitie Supabase)
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### 4. Spustite migrácie

V Supabase dashboarde:

1. Kliknite na **SQL Editor** v ľavom menu
2. Kliknite na **"+ New query"**
3. Skopírujte obsah súboru `supabase/migrations/0001_init.sql`
4. Vložte do editora
5. Kliknite **Run** (Ctrl/Cmd + Enter)
6. Počkajte na dokončenie ✓

### 5. Spustite RLS migráciu

Ešte raz v SQL Editore:

1. Vytvorte nový query
2. Skopírujte obsah `supabase/migrations/0002_rls.sql`
3. Vložte a spustite **Run**

### 6. Načítajte seed dáta (dummy data)

V SQL Editore:

1. Vytvorte nový query
2. Skopírujte obsah `supabase/seed.sql`
3. Vložte a spustite **Run**
4. Mali by ste vidieť hlášku: "Seed data inserted successfully!"

### 7. Overte dáta

V Supabase dashboarde:

1. Kliknite na **Table Editor** v ľavom menu
2. Mali by ste vidieť tabuľky:
   - `clients` (3 záznamy)
   - `projects` (4 záznamy)
   - `tasks` (15 záznamov)
   - `time_entries` (5 záznamov)
   - atď.

### 8. Reštartujte Next.js server

```bash
# Zastavte ak beží (Ctrl+C)
# Spustite znova
npm run dev
```

### 9. Otvorte aplikáciu

```bash
http://localhost:3000
```

Teraz by ste mali vidieť skutočné dáta z Supabase! 🎉

---

## 🔍 Overenie pripojenia

### Test v prehliadači:

1. Otvorte **Klienti** → mali by ste vidieť:
   - Acme Corporation
   - TechStart s.r.o.
   - Global Solutions

2. Otvorte **Projekty** → mali by ste vidieť:
   - E-commerce Platform (ECOM-2024)
   - AI Chatbot Integration (AI-BOT-001)
   - atď.

3. Otvorte **Úlohy** → mali by ste vidieť úlohy s actual hours

### Test v konzole:

Otvorte DevTools (F12) → Console a skúste:

```javascript
fetch('/api/clients')
  .then(r => r.json())
  .then(d => console.log(d))
```

Mali by ste vidieť `{success: true, data: [...]}`

---

## 🛠️ Troubleshooting

### Chyba: "Invalid API key"
- Skontrolujte či ste správne skopírovali `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Reštartujte dev server (`npm run dev`)

### Chyba: "relation does not exist"
- Migrácie neboli spustené správne
- Spustite `0001_init.sql` znova v SQL Editore

### Chyba: "row-level security policy"
- RLS migrácia nebola spustená
- Spustite `0002_rls.sql` v SQL Editore

### Prázdne dáta
- Seed súbor nebol spustený
- Spustite `supabase/seed.sql` v SQL Editore

### Stále vidím "Žiadni klienti"
- Skontrolujte `.env.local` - správne URL a kľúč?
- Reštartujte dev server
- Otvorte Network tab v DevTools - vidíte 401/403 error?

---

## 📚 Ďalšie kroky

### Autentifikácia (neskôr):

1. V Supabase: **Authentication** → **Providers**
2. Povoľte Email/Password alebo Google/GitHub
3. Upravte `src/lib/supabase.ts` pre auth

### Production deployment:

1. Nasaďte na Vercel/Netlify
2. Pridajte ENV premenné v deployment settings
3. Supabase automaticky funguje (žiadne ďalšie nastavenia)

---

## 🎯 Quick Start (Zhrnutie)

```bash
# 1. Vytvorte projekt na supabase.com
# 2. Skopírujte URL a anon key do .env.local
# 3. Spustite migrácie v SQL Editore:
#    - supabase/migrations/0001_init.sql
#    - supabase/migrations/0002_rls.sql
#    - supabase/seed.sql
# 4. Reštartujte server
npm run dev

# Hotovo! 🚀
```

