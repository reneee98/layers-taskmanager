# 💰 Hourly Rate Resolution

## 📋 Prehľad

Funkcia `resolveHourlyRate` určuje hodinovú sadzbu pre používateľa v projekte podľa **3-úrovňovej priority**.

## 🎯 Priorita

```
1. project_members.hourly_rate  (najvyššia priorita - override pre konkrétny projekt)
   ↓
2. rates table                   (user-specific alebo role-specific, posledná platná)
   ↓
3. Fallback: 0                   (ak nič nie je definované)
```

## 📦 Použitie

### Async verzia (s Supabase):

```typescript
import { resolveHourlyRate } from "@/server/rates/resolveHourlyRate";

const result = await resolveHourlyRate(userId, projectId);

console.log(result);
// {
//   hourlyRate: 150,
//   source: "project_member",
// }
```

### Sync verzia (pre testovanie):

```typescript
import { resolveHourlyRateSync } from "@/server/rates/resolveHourlyRate";

const result = resolveHourlyRateSync(
  userId,
  projectId,
  projectMember,  // { hourly_rate: 150 }
  rates           // [{ ... }]
);
```

## 🔍 Logika Rozhodnutia

### 1️⃣ Project Member Override

Najvyššia priorita - ak je definovaná hodinová sadzba pre konkrétneho používateľa v projekte:

```sql
SELECT hourly_rate 
FROM project_members 
WHERE project_id = ? AND user_id = ?
```

**Použitie:**
- Špeciálna sadzba pre klienta
- Zľava/prirážka pre konkrétny projekt
- Override štandardnej sadzby

**Príklad:**
```typescript
// Developer má zvyčajne 100€/h, ale pre tento projekt 150€/h
project_members: {
  user_id: "dev-123",
  project_id: "project-456",
  hourly_rate: 150  // ← Toto sa použije
}
```

### 2️⃣ Rates Table

Ak nie je project member override, hľadá sa v `rates` tabuľke:

**Filter:**
- `valid_from <= today` (už platná)
- `valid_to IS NULL OR valid_to >= today` (ešte platná)

**Priorita v rates:**
1. User-specific rate (`user_id = ?`)
2. Project-specific rate (`project_id = ?`)
3. Non-default rate (`is_default = false`)
4. Najnovšia (podľa `valid_from DESC`)

**Príklad:**
```typescript
rates: [
  {
    id: "rate-1",
    name: "Senior Developer Rate",
    hourly_rate: 120,
    user_id: "dev-123",           // ← User-specific
    valid_from: "2024-01-01",
    valid_to: null,               // Open-ended
    is_default: false
  },
  {
    id: "rate-2", 
    name: "Project Default Rate",
    hourly_rate: 90,
    project_id: "project-456",    // ← Project-specific
    valid_from: "2024-01-01",
    valid_to: null,
    is_default: true
  }
]
// Použije sa rate-1 (120€/h) - user-specific má prednosť
```

### 3️⃣ Fallback

Ak nič nie je nájdené → `0`

```typescript
{
  hourlyRate: 0,
  source: "fallback"
}
```

## 📊 Response Type

```typescript
interface ResolveRateResult {
  hourlyRate: number;                           // Sadzba v EUR
  source: "project_member" | "rates_table" | "fallback";
  rateId?: string;                              // ID z rates (ak source = rates_table)
  rateName?: string;                            // Názov sadzby (ak source = rates_table)
}
```

## 🧪 Testy

Spustite testy:

```bash
npm test -- src/server/rates/resolveHourlyRate.test.ts
```

**Pokrytie:**
- ✅ Project member override
- ✅ User-specific rates
- ✅ Project-specific rates
- ✅ Date validation (valid_from, valid_to)
- ✅ Default vs non-default rates
- ✅ Fallback behavior
- ✅ Edge cases (0, null, decimals)

**Výsledok:**
```
✓ src/server/rates/resolveHourlyRate.test.ts (14 tests)
  ✓ Priority 1: project_members.hourly_rate (3)
  ✓ Priority 2: rates table (6)
  ✓ Priority 3: Fallback (3)
  ✓ Edge cases (4)
```

## 💡 Príklady Použitia

### 1. Time Entry Calculation

```typescript
// Pri vytváraní time entry
const { hourlyRate } = await resolveHourlyRate(userId, projectId);
const amount = hours * hourlyRate;

await supabase.from("time_entries").insert({
  user_id: userId,
  project_id: projectId,
  hours,
  hourly_rate: hourlyRate,
  amount
});
```

### 2. Project Budget Estimate

```typescript
// Odhadnúť náklady projektu
const members = await getProjectMembers(projectId);

let totalCost = 0;
for (const member of members) {
  const { hourlyRate } = await resolveHourlyRate(member.user_id, projectId);
  totalCost += member.estimated_hours * hourlyRate;
}

console.log(`Estimated labor cost: ${totalCost}€`);
```

### 3. Invoice Line Item

```typescript
// Generovať faktúru
const timeEntries = await getTimeEntries(projectId);

const lineItems = await Promise.all(
  timeEntries.map(async (entry) => {
    const { hourlyRate, source } = await resolveHourlyRate(
      entry.user_id,
      projectId
    );
    
    return {
      description: `${entry.user_name} - ${entry.task_name}`,
      hours: entry.hours,
      rate: hourlyRate,
      amount: entry.hours * hourlyRate,
      rateSource: source
    };
  })
);
```

### 4. API Endpoint

```typescript
// GET /api/projects/[id]/rates
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const members = await getProjectMembers(params.id);
  
  const membersWithRates = await Promise.all(
    members.map(async (member) => {
      const rate = await resolveHourlyRate(member.user_id, params.id);
      return {
        ...member,
        effectiveRate: rate
      };
    })
  );

  return Response.json({ success: true, data: membersWithRates });
}
```

## 🔧 Konfigurácia

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Database Schema

**project_members:**
```sql
CREATE TABLE project_members (
  user_id UUID,
  project_id UUID,
  hourly_rate NUMERIC(10, 2),  -- Override rate
  ...
);
```

**rates:**
```sql
CREATE TABLE rates (
  id UUID PRIMARY KEY,
  project_id UUID,              -- NULL = global
  user_id UUID,                 -- NULL = role-based
  name VARCHAR(255),
  hourly_rate NUMERIC(10, 2),
  valid_from DATE,
  valid_to DATE,                -- NULL = open-ended
  is_default BOOLEAN
);
```

## 🎨 Best Practices

### 1. Cache Results
```typescript
// Cache pre session
const rateCache = new Map<string, ResolveRateResult>();

function getCachedRate(userId: string, projectId: string) {
  const key = `${userId}-${projectId}`;
  if (!rateCache.has(key)) {
    rateCache.set(key, await resolveHourlyRate(userId, projectId));
  }
  return rateCache.get(key)!;
}
```

### 2. Audit Trail
```typescript
const rate = await resolveHourlyRate(userId, projectId);

// Log pre audit
await logRateResolution({
  user_id: userId,
  project_id: projectId,
  resolved_rate: rate.hourlyRate,
  source: rate.source,
  rate_id: rate.rateId,
  timestamp: new Date()
});
```

### 3. Validation
```typescript
const rate = await resolveHourlyRate(userId, projectId);

if (rate.source === "fallback") {
  console.warn(`No rate defined for user ${userId} in project ${projectId}`);
  // Možno notifikovať admin
}
```

## 🐛 Troubleshooting

### Problém: Vždy vracia 0
**Riešenie:**
1. Skontrolujte `project_members` tabuľku
2. Skontrolujte `rates` tabuľku (valid_from, valid_to)
3. Overte, že rates nie sú expirované

### Problém: Nesprávna sadzba
**Riešenie:**
1. Skontrolujte prioritu (project_member > rates)
2. Overte date ranges v rates
3. Skontrolujte `is_default` flag

### Problém: Performance issues
**Riešenie:**
1. Pridajte indexy na rates (user_id, project_id, valid_from)
2. Používajte `resolveHourlyRateSync` ak máte dáta
3. Cache results

## 📚 Súvisiace

- `src/app/api/rates/*` - CRUD pre rates
- `src/types/database.ts` - TypeScript types
- `supabase/migrations/0001_init.sql` - Databázová schéma

