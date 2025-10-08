# 🚀 Complete Setup Guide

## ✅ Čo sme vytvorili:

### 📦 Backend (API):
1. **Clients** - CRUD (`/api/clients/*`)
2. **Projects** - CRUD (`/api/projects/*`)
3. **Tasks** - CRUD + reorder (`/api/tasks/*`)
4. **Time Entries** - CRUD (`/api/tasks/[id]/time`, `/api/time-entries/[id]`)
5. **Cost Items** - CRUD (`/api/costs/*`)
6. **Rate Resolution** - Auto-resolve hourly rates

### 🎨 Frontend (UI):
1. **Dashboard** (`/`) - Home page
2. **Clients** (`/clients`) - DataTable + CRUD dialogs
3. **Projects** (`/projects`) - DataTable + filters
4. **Project Detail** (`/projects/[id]`) - Header + 4 tabs:
   - **Tasks** - Task list (placeholder)
   - **Time** - TimePanel (timer + manual entry)
   - **Costs** - CostsPanel (external costs)
   - **Report** - Finance report (placeholder)
5. **Tasks** (`/tasks`) - TaskTable s drag&drop + inline editing

### 🔗 Features:
- ✅ Click na task → presmerovanie na project detail
- ✅ Timer (start/stop) + manual time entry
- ✅ Cost items s výpočtom DPH
- ✅ Finance snapshot (labor_cost + external_cost)
- ✅ Rate resolution (auto alebo manual)

---

## 🎯 SETUP KROK ZA KROKOM:

### 1️⃣ Otvorte Supabase SQL Editor
```
https://supabase.com/dashboard/project/ucwiuqpkogixqpnvgetl/sql
```

### 2️⃣ Skopírujte a spustite:
```sql
-- Otvorte súbor: supabase/complete_setup.sql
-- Skopírujte CELÝ obsah (500+ riadkov)
-- Vložte do SQL editora
-- Kliknite RUN
```

**Čo to urobí:**
- ✅ Vypne RLS (pre vývoj)
- ✅ Pridá chýbajúce stĺpce (`code`, `currency`, `fee_markup_pct`, `order_index`)
- ✅ Vymaže staré dummy data
- ✅ Vloží 3 klientov, 3 projekty, 6 úloh
- ✅ Vloží 3 time entries, 2 cost items
- ✅ Vloží 2 rates pre rate resolution
- ✅ Zobrazí výsledky

### 3️⃣ Overte výsledok:
Po spustení by ste mali vidieť:
```
✅ SETUP COMPLETE!

KLIENTI:        3
PROJEKTY:       3
ÚLOHY:          6
TIME ENTRIES:   3
COST ITEMS:     2
RATES:          2

E-commerce Platform | ECOM-2024 | active | 3 tasks | 2150€ labor | 300€ external
AI Chatbot          | AI-BOT-2024 | active | 2 tasks | 0€ labor | 500€ external
Mobile App Redesign | MOBILE-2024 | draft | 1 tasks | 0€ labor | 0€ external
```

### 4️⃣ Otvorte aplikáciu:
```bash
# Ak server už beží:
http://localhost:3000

# Ak nie, spustite:
cd layers-studio
npm run dev
```

---

## 🧪 TEST SCENÁRE:

### ✅ Test 1: Clients
1. Otvorte: http://localhost:3000/clients
2. Vidíte: 3 klientov (Acme, TechStart, Global)
3. Kliknite "Pridať klienta"
4. Vytvorte nového klienta
5. ✅ Zobrazí sa v tabuľke

### ✅ Test 2: Projects
1. Otvorte: http://localhost:3000/projects
2. Vidíte: 3 projekty
3. Filter: Status = "Active" → 2 projekty
4. Kliknite na "E-commerce Platform"
5. ✅ Presmerovanie na detail

### ✅ Test 3: Tasks
1. Otvorte: http://localhost:3000/tasks
2. Vidíte: 6 úloh s drag&drop
3. Kliknite na **názov úlohy** (napr. "Frontend Development")
4. ✅ Presmerovanie na `/projects/[id]?tab=time`

### ✅ Test 4: Time Tracking
1. Na project detail kliknite tab **"Čas"**
2. Vidíte: Timer + Manual entry + Time entries table
3. Zadajte:
   - Hodiny: `2`
   - Dátum: dnes
   - Poznámka: "Test"
4. Kliknite "Pridať záznam"
5. ✅ Toast: "Pridaných 2.00 h • 200.00 €"
6. ✅ Záznam v tabuľke
7. ✅ Labor cost sa zvýši

### ✅ Test 5: Cost Items
1. Na project detail kliknite tab **"Náklady"**
2. Vidíte: Existujúce náklady
3. Kliknite "Pridať náklad"
4. Zadajte:
   - Typ: `Grafika`
   - Popis: `grafička 1`
   - Množstvo: `1`
   - Jednotková cena: `250`
   - DPH: `20`
5. Preview: `300.00 €`
6. Kliknite "Pridať náklad"
7. ✅ Toast: "Náklad pridaný • 300.00 €"
8. ✅ Footer: External cost sa zvýši

### ✅ Test 6: Inline Editing (Tasks)
1. Otvorte: http://localhost:3000/tasks
2. Kliknite na **Status** dropdown pri úlohe
3. Zmeňte na "Done"
4. ✅ Toast: "Status bol zmenený"
5. ✅ Farba badge sa zmení na zelenú

### ✅ Test 7: Timer
1. Project detail → tab "Čas"
2. Vyberte úlohu
3. Kliknite **Start**
4. Počkajte 10 sekúnd
5. Kliknite **Stop**
6. ✅ Automaticky vytvorí time entry (~0.003h)

---

## 📊 Finance Snapshot

Po pridaní time entry alebo cost item by API malo vrátiť:

```json
{
  "success": true,
  "data": {
    "financeSnapshot": {
      "project_id": "...",
      "billable_hours": 23.5,
      "labor_cost": 2350.00,
      "external_cost": 800.00,
      "fee_amount": 472.50,  // (2350 + 800) * 0.15
      "total_price": 3622.50,
      "margin": 472.50,
      "margin_pct": 15.0
    }
  }
}
```

---

## 🐛 Troubleshooting

### Problém: "Žiadne úlohy"
**Riešenie:** Spustite `complete_setup.sql` znova

### Problém: "Permission denied"
**Riešenie:** RLS je zapnuté. Vypnite ho:
```sql
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
```

### Problém: "Rate je 0€"
**Riešenie:** 
1. Pridajte rate do `rates` tabuľky
2. Alebo zadajte manuálnu sadzbu pri vytváraní time entry

### Problém: Server crashuje
**Riešenie:**
```bash
# Vyčistite cache
rm -rf .next
npm run build
npm run dev
```

---

## ✨ Hotovo!

**Máte funkčný Task Manager s:**
- ✅ 3 klientmi
- ✅ 3 projektami
- ✅ 6 úlohami
- ✅ Time tracking (timer + manual)
- ✅ Cost items (s DPH)
- ✅ Finance snapshot
- ✅ Drag & drop
- ✅ Inline editing
- ✅ Auto rate resolution

**Testujte na:** http://localhost:3000 🚀

