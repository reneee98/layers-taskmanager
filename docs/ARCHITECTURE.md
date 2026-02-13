# Architektúra – Layers Studio

Prehľad štruktúry aplikácie, hlavných routes a dátového toku pre ľahšiu orientáciu a úpravy.

---

## 1. Štruktúra priečinkov

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API route handlers (REST)
│   ├── (pages)             # Stránky: dashboard, projects, tasks, login, admin, …
│   ├── layout.tsx
│   └── globals.css
├── components/             # React komponenty podľa domény
│   ├── ui/                 # Základné UI (shadcn/Radix)
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   ├── report(s)/
│   └── …
├── contexts/               # React context (theme, layout, …)
├── hooks/                  # Custom hooks (permissions, workspace, …)
├── lib/                    # Utility, Supabase, auth, validations, format
├── server/                 # Server-only logika (finance, rates)
├── types/                  # TypeScript typy (database.ts, …)
└── test/
```

---

## 2. Hlavné routes (stránky)

| Cesta | Popis |
|-------|--------|
| `/` | Úvod / presmerovanie |
| `/login` | Prihlásenie |
| `/dashboard` | Dashboard (úlohy, aktivita) |
| `/projects` | Zoznam projektov |
| `/projects/[projectId]` | Detail projektu |
| `/projects/[projectId]/tasks/[taskId]` | Detail úlohy (vnorený v projekte) |
| `/projects/[projectId]/report` | Report projektu (PDF export, toggles) |
| `/tasks` | Všetky úlohy (cross-project) |
| `/tasks/[taskId]` | Detail úlohy (priamy link) |
| `/clients` | Klienti |
| `/time-entries` | Časové záznamy |
| `/invoices` | Faktúry |
| `/settings` | Nastavenia používateľa |
| `/admin/*` | Admin (bugs, roles, users) |
| `/workspaces/[workspaceId]/members` | Členovia workspace |
| `/share/tasks/[shareToken]` | Verejné zdieľanie úlohy (read-only) |

---

## 3. API – hlavné skupiny

- **Auth / user:** `api/auth/*`, `api/me/*`
- **Workspaces:** `api/workspaces/`, `api/workspaces/[workspaceId]/*`, invitations, members, roles
- **Projekty:** `api/projects/`, `api/projects/[projectId]/*` (vrátane finance, summary, links)
- **Úlohy:** `api/tasks/`, `api/tasks/[taskId]/*` (route, time, comments, checklist, assignees, files, share, finance)
- **Čas:** `api/tasks/[taskId]/time`, `api/time-entries/`, `api/timers/*`
- **Dashboard:** `api/dashboard/*` (activity, assigned-tasks, init, tasks-batch)
- **Admin:** `api/admin/*`, `api/bugs/*`, `api/list-all-users`
- **Ostatné:** `api/clients/`, `api/costs/`, `api/invoices/*`, `api/search`, `api/share/tasks/*`

API volania z frontendu sú typicky `fetch('/api/...')`, s autentifikáciou cez cookies (Supabase SSR).

---

## 4. Dátový model (stručne)

- **Workspace** – tenant; má owner, members, roles. Väčšina entít patrí do workspace.
- **Project** – `workspace_id`, voliteľne `client_id`. Má status, budget, hourly_rate, …
- **Task** – `project_id`, status, priority, assignees (M:N), actual_hours, budget_cents, time entries, checklist.
- **TimeEntry** – `task_id`, `user_id`, duration, description; súvisí s timerom a fakturáciou.
- **Oprávnenia** – role na workspace (owner, admin, user) + resource/action (napr. financial.view_reports). Kontrola na BE aj FE.

Typy sú v `src/types/database.ts`; schéma a RLS v `supabase/`.

---

## 5. Dátový tok (typický príklad)

- **Načítanie projektu:** Stránka `/projects/[projectId]` volá `GET /api/projects/[projectId]`. API použije Supabase (server) a vráti projekt (+ client ak je).
- **Úlohy projektu:** `GET /api/tasks?project_id=...` alebo dashboard batch endpoint. Frontend ukladá do state alebo zobrazuje cez komponenty.
- **Report a PDF:** Stránka reportu načíta projekt, úlohy a time entries cez API; PDF sa generuje na klientovi (pdfmake) podľa stavu (vrátane toggles „skryť hodiny v PDF“).
- **Zmeny a oprávnenia:** Mutácie (POST/PATCH/DELETE) idú cez API; API overí session a oprávnenia (auth/lib) a potom volá Supabase.

---

## 6. Bezpečnosť a RLS

- Supabase RLS (Row Level Security) obmedzuje prístup k riadkom podľa `workspace_id` a role.
- API routes overujú session (Supabase auth) a kde treba aj konkrétne oprávnenia (napr. financial).
- Detaily: `supabase/RLS_DOCUMENTATION.md`, `src/lib/auth/`.

---

## 7. Rozšírenie funkcionality – kde začať

- **Nová stránka:** Pridať `src/app/.../page.tsx` a prípadne layout.
- **Nový API endpoint:** Pridať `src/app/api/.../route.ts` s GET/POST/PATCH/DELETE; použiť Supabase server client a auth.
- **Nový typ entity:** Rozšíriť `src/types/database.ts`; DB zmeny v `supabase/migrations/`.
- **Nový UI blok v existujúcej stránke:** Komponent do `src/components/<doména>/` a import do príslušnej stránky.

Viac konkrétnych konvencií a „kde čo“ je v **AGENTS.md**.
