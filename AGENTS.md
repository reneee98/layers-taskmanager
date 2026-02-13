---
description: 
alwaysApply: true
---

# Kontext pre AI (Agents / Cursor)

Tento súbor slúži ako must-have kontext pre AI asistentov pri úpravách projektu **Layers Studio** (Next.js, Supabase, TypeScript).

---

## Stack a technológie

- **Next.js 14** – App Router (`src/app/`), API routes v `src/app/api/`
- **TypeScript** – prísne typy, typy entít v `src/types/database.ts`
- **Tailwind CSS** – všetky štýly cez triedy, žiadne vlastné CSS súbory okrem `globals.css` a výnimiek (napr. WeekView.css)
- **UI:** Radix-based komponenty v `src/components/ui/` (button, card, dialog, table, switch, …), `components.json` pre shadcn
- **Supabase** – Auth, PostgreSQL, RLS. Klient: `src/lib/supabase/client.ts`, server: `src/lib/supabase/server.ts`, service role: `src/lib/supabase/service.ts`
- **Validácia:** Zod schémy v `src/lib/validations/` (project, task, time-entry, user, cost-item, …)
- **Formuláre:** react-hook-form + @hookform/resolvers (zod)

---

## Štruktúra projektu (kde čo hľadať / pridávať)

| Čo | Kde |
|----|-----|
| Stránky (routes) | `src/app/**/page.tsx` (App Router) |
| API endpointy | `src/app/api/**/route.ts` (GET, POST, PATCH, DELETE) |
| Znovupoužiteľné UI komponenty | `src/components/` – podľa domény (tasks, projects, auth, report, …) |
| Základné UI (button, input, dialog…) | `src/components/ui/` |
| Typy (Project, Task, Workspace, …) | `src/types/database.ts` |
| Supabase volania, helpers | `src/lib/supabase/`, `src/lib/db/` |
| Auth a oprávnenia | `src/lib/auth/`, `src/hooks/usePermissions.ts`, `useWorkspaceRole.ts` |
| Formátovanie (mena, meny, hodiny) | `src/lib/format.ts` |
| Kontexty (theme, layout, …) | `src/contexts/` |
| Hooks | `src/hooks/` |
| Server-only logika (finance, rates) | `src/server/` (napr. `src/server/finance/`, `src/server/rates/`) |
| Migrácie a schéma DB | `supabase/migrations/`, `supabase/README.md` |

---

## Konvencie kódu

- **Styling:** Iba Tailwind triedy. Pre podmienené triedy použiť `cn()` z `@/lib/utils` (napr. `cn("base", condition && "extra")`).
- **Názvy:** Popisné premenné a funkcie. Event handlery s prefixom `handle` (napr. `handleSubmit`, `handleToggle`).
- **Komponenty:** Preferovať `const Component = () => {}`. Typy/interfaces pre props definovať pri komponente alebo v types.
- **Early returns:** Pre čitateľnosť – skorý return pri chybách alebo neplatnom stave.
- **Prístupnosť:** Kde je to možné – `aria-label`, `tabIndex` pri interaktívnych prvkoch.
- **Jazyk UI:** Slovenský (labely, toasty, chybové hlášky).

---

## Dôležité domény v aplikácii

- **Workspace** – multi-tenant; väčšina dát je via `workspace_id`. Current workspace: `useCurrentWorkspace()`, `useWorkspaceRole()`.
- **Projekty a úlohy** – `Project` má `workspace_id`, `Task` má `project_id`. API: `/api/projects`, `/api/tasks`, `/api/tasks/[taskId]/…`.
- **Čas a fakturácia** – time entries (`/api/tasks/[taskId]/time`), timery (`/api/timers/…`), finance (`/api/projects/[projectId]/finance`). Výpočty: `src/server/finance/`, `src/server/rates/`.
- **Oprávnenia** – resource/action (napr. `financial`, `view_reports`). Hook: `usePermission()`, `useDashboardPermissions()`. Kontrola na API v `src/lib/auth/`.
- **Report a PDF** – report stránka: `src/app/projects/[projectId]/report/page.tsx`, generátor PDF (pdfmake) priamo v tej stránke. Toggle „skryť hodiny v PDF“ je per-task state v tej istej stránke.

---

## API route pattern

- Route handlers v `src/app/api/.../route.ts` exportujú `GET`, `POST`, `PATCH`, `DELETE`.
- Autentifikácia: často cez Supabase `createClient()` z `@/lib/supabase/server` a kontrola session.
- Oprávnenia: kde treba, volať `checkPermission` alebo ekvivalent z `src/lib/auth/`.
- Odpoveď: `NextResponse.json({ success: true, data })` alebo `NextResponse.json({ success: false, error }, { status: 4xx })`.

---

## Čo nerobiť

- Nepridávať globálne CSS súbory pre komponenty (používať Tailwind).
- Nemeníť štruktúru Supabase (tabuľky, RLS) bez potreby a bez zmien v `supabase/`.
- Neignorovať workspace kontext – dáta a API sú via workspace (alebo project/task patriace do workspace).

---

## Súvisiace súbory pre hlbší kontext

- **ARCHITECTURE:** `docs/ARCHITECTURE.md` – routes, dátový tok, hlavné flow.
- **DB a RLS:** `supabase/README.md`, `supabase/RLS_DOCUMENTATION.md`.
- **Permissions:** `PERMISSIONS_AUDIT.md` (ak existuje).
