# Layers Task Manager

Profesionálny systém na správu úloh postavený na Next.js 14 s TypeScript.

## Technológie

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (autentifikácia & databáza)
- **Zod** (validácia)
- **Drizzle ORM** (databázové dotazy)
- **Framer Motion** (animácie)
- **Recharts** (grafy)
- **Vitest** + **Testing Library** (unit testy)
- **Playwright** (E2E testy)

## Začíname

### Predpoklady

- Node.js 18+
- pnpm

### Inštalácia

```bash
# Nainštalovať závislosti
pnpm install

# Nastaviť ENV premenné
cp .env.example .env.local
# Vyplniť NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Vývoj

```bash
# Spustiť dev server
pnpm dev

# Spustiť linter
pnpm lint

# Formátovať kód
pnpm format

# Spustiť testy
pnpm test

# Spustiť E2E testy
pnpm test:e2e
```

### Build

```bash
# Vytvoriť produkčný build
pnpm build

# Spustiť produkčnú verziu
pnpm start
```

## Štruktúra projektu

```
src/
├── app/                 # Next.js app router
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Homepage
│   └── globals.css     # Global styles
├── components/
│   ├── layout/         # Layout komponenty (TopNav, SideNav)
│   ├── providers/      # React providers
│   └── ui/             # shadcn/ui komponenty
├── lib/
│   ├── supabase.ts     # Supabase client
│   ├── zod-helpers.ts  # Zod utilities
│   └── utils.ts        # Pomocné funkcie
└── hooks/              # Custom hooks
```

## Funkcie

- ✅ Dark theme (default)
- ✅ Responzívny layout (TopNav + SideNav)
- ✅ TypeScript strict mode
- ✅ Error boundaries
- ✅ Loading states
- ✅ Toast notifikácie
- ✅ Zod validácia
- ✅ Formátovanie meny (sk-SK, EUR)
- ✅ Supabase autentifikácia (RLS)

## Bezpečnosť

- Používa iba `anon` kľúč (žiadny `service_role`)
- Row Level Security (RLS) na všetkých tabuľkách
- Session JWT autentifikácia

## Formátovanie

- Hodiny: zaokrúhlené na 3 desatinné miesta
- Mena: zobrazené na 2 desatinné miesta (€)
- Locale: sk-SK

## Licencia

Private

