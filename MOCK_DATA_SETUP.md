# Mock Data Setup - Testovanie bez databázy

Vytvoril som pre vás **mock dáta** v súbore `src/lib/mock-data.ts`, ktoré môžete použiť na testovanie UI bez pripojenia k databáze.

## 📦 Čo obsahujú mock dáta?

### Klienti (3):
- **Acme Corporation** - IT projekty
- **TechStart s.r.o.** - AI startup  
- **Global Solutions** - Medzinárodná firma

### Projekty (4):
- **E-commerce Platform** (ECOM-2024) - Active, 50,000€
- **AI Chatbot Integration** (AI-BOT-001) - In Progress, 25,000€
- **Mobile App Redesign** (MOBILE-2024) - Draft, 35,000€
- **Data Analytics Dashboard** (DASH-2024) - Completed, 18,000€

### Úlohy (12):
- **E-commerce:** Frontend (3 sub-tasks), Backend, Database, Testing
- **AI Chatbot:** OpenAI Integration, Chat UI, Context Management
- **Mobile App:** UI/UX Design, iOS Implementation

## 🚀 Ako použiť mock dáta

### Možnosť 1: Upravte API routes (najrýchlejšie)

Upravte váš API endpoint, napríklad `/api/clients/route.ts`:

\`\`\`typescript
import { getMockClients } from "@/lib/mock-data";

export async function GET() {
  // Použite mock dáta namiesto Supabase
  const clients = getMockClients();
  return NextResponse.json({ success: true, data: clients });
}
\`\`\`

### Možnosť 2: Vytvorte mock API wrapper

Vytvorte súbor `src/lib/api-client.ts`:

\`\`\`typescript
import { getMockClients, getMockProjects, getMockTasks } from "./mock-data";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export const apiClient = {
  clients: {
    getAll: async () => USE_MOCK ? getMockClients() : fetch("/api/clients"),
    // ...
  },
  // ...
};
\`\`\`

### Možnosť 3: Upravte komponenty priamo

V komponentoch použite mock dáta priamo:

\`\`\`typescript
import { getMockClients } from "@/lib/mock-data";

const fetchClients = async () => {
  // Dočasne použite mock dáta
  setClients(getMockClients());
};
\`\`\`

## ⚙️ ENV konfigurácia

Vytvorte `.env.local`:

\`\`\`bash
# Mock Mode
NEXT_PUBLIC_USE_MOCK_DATA=true

# Supabase (vyplňte neskôr)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
\`\`\`

## 🔄 Prepnutie na skutočnú databázu

Keď budete mať Supabase nastavené:

1. Nastavte ENV premenné v `.env.local`
2. Spustite migrácie: `supabase db reset`
3. Načítajte seed dáta: `psql $DATABASE_URL -f supabase/seed.sql`
4. Zmeňte `NEXT_PUBLIC_USE_MOCK_DATA=false`

## 📝 Helper funkcie

\`\`\`typescript
import {
  getMockClients,
  getMockProjects, 
  getMockTasks,
  getMockClientById,
  getMockProjectById,
  getMockTaskById,
  getMockProjectsByClient,
  getMockTasksByProject,
  getMockSubTasks
} from "@/lib/mock-data";

// Použitie:
const allClients = getMockClients();
const client = getMockClientById("11111111-1111-1111-1111-111111111111");
const projectTasks = getMockTasksByProject("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
\`\`\`

Mock dáta sú teraz pripravené! Stačí ich importovať a použiť vo vašich komponentoch.

