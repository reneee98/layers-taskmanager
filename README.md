# Layers Studio (laydo)

Task manager a projektová aplikácia s workspace, úlohami, časovými záznamami, fakturáciou a reportami.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Jazyk:** TypeScript
- **Styling:** Tailwind CSS, Radix UI (cez shadcn-style komponenty v `src/components/ui/`)
- **Backend / DB:** Supabase (PostgreSQL, Auth, RLS)
- **Validácia:** Zod (`src/lib/validations/`)
- **Testy:** Vitest (unit), Playwright (e2e)

## Požiadavky

- Node.js 18+
- npm alebo yarn
- Supabase projekt (pre env premenné)

## Inštalácia a spustenie

```bash
npm install
cp .env.example .env.local   # alebo .env – doplň Supabase URL a anon key
npm run dev
```

Aplikácia beží na **http://localhost:3001**.

## Skripty

| Príkaz | Popis |
|--------|--------|
| `npm run dev` | Dev server (port 3001) |
| `npm run build` | Production build |
| `npm run start` | Spustenie production buildu |
| `npm run lint` | ESLint |
| `npm run format` | Prettier – formátovanie kódu |
| `npm run test` | Vitest – unit testy |
| `npm run test:ui` | Vitest UI |
| `npm run test:e2e` | Playwright e2e testy |

## Env premenné

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon (public) key  
Ďalšie môžu byť v `.env.local` alebo v dokumentácii Supabase (`supabase/README.md`).

## Dôležitá dokumentácia

- **Pre AI / kontext projektu:** `AGENTS.md`
- **Architektúra a štruktúra:** `docs/ARCHITECTURE.md`
- **Databáza a RLS:** `supabase/README.md`, `supabase/RLS_DOCUMENTATION.md`
