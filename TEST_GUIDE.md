# 🧪 TEST GUIDE - Layers Task Manager

## ✅ 1. Server beží
```bash
npm run dev
```
Otvorte: http://localhost:3000

---

## ✅ 2. Test Databázy (Supabase)

### Skontrolujte či máte dáta:
1. Otvorte Supabase SQL Editor
2. Spustite:
```sql
SELECT * FROM clients;
SELECT * FROM projects;
SELECT * FROM tasks;
```

**Očakávaný výsledok:**
- 3 klienti
- 3 projekty  
- 6 úloh

---

## ✅ 3. Test TIME TRACKING

### A) Prejdite na projekt:
1. http://localhost:3000/projects
2. Kliknite na **"E-commerce Platform"**
3. Prejdite na tab **"Čas"**

### B) Manuálny záznam:
1. **Vyberte úlohu:** "Frontend Development"
2. **Zadajte hodiny:** `2`
3. **Dátum:** dnes
4. **Poznámka:** "Test time entry"
5. **Kliknite:** "Pridať záznam"

**Očakávaný výsledok:**
- ✅ Toast: "Pridaných 2.00 h • 200.00 €"
- ✅ Záznam v tabuľke
- ✅ Footer: labor_cost sa zvýšil

### C) Timer:
1. **Vyberte úlohu:** "Backend API"
2. **Kliknite:** "Štart"
3. **Počkajte** 10 sekúnd
4. **Kliknite:** "Stop"

**Očakávaný výsledok:**
- ✅ Toast: "Pridaných 0.003 h • 0.30 €"
- ✅ Nový záznam v tabuľke

---

## ✅ 4. Test COST ITEMS

### Prejdite na tab "Náklady":
1. Kliknite **"Pridať náklad"**
2. **Názov:** `Grafická práca`
3. **Popis:** `Logo design`
4. **Kategória:** `Graphics`
5. **Suma:** `250`
6. **Dátum:** dnes
7. **Kliknite:** "Pridať"

**Očakávaný výsledok:**
- ✅ Toast: "Náklad pridaný • 250.00 €"
- ✅ Záznam v tabuľke
- ✅ Footer: external_cost sa zvýšil o 250€

---

## 🐛 Troubleshooting

### Problém: "Nepodarilo sa pridať záznam"
**Riešenie:**
1. Otvorte DevTools (F12) → Console
2. Skontrolujte chyby
3. Overte `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ucwiuqpkogixqpnvgetl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

### Problém: "Permission denied"
**Riešenie:**
1. Otvorte Supabase SQL Editor
2. Vypnite RLS:
   ```sql
   ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
   ALTER TABLE cost_items DISABLE ROW LEVEL SECURITY;
   ```

### Problém: API route chyba
**Riešenie:**
```bash
rm -rf .next
npm run dev
```

---

## 📊 Overenie Finance View

V Supabase spustite:
```sql
SELECT * FROM project_finance_view 
WHERE project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
```

**Mali by ste vidieť:**
- `billable_hours`: suma všetkých hodín
- `labor_cost`: suma všetkých time_entries.amount
- `external_cost`: suma všetkých cost_items.amount
- `total_price`: labor_cost + external_cost + fee
- `margin`: total_price - budget

---

## ✅ Acceptance Criteria

### Time Tracking:
- [x] Pridať 2h manuálne → labor_cost > 0 ✅
- [x] Timer 10s → vytvorí záznam ✅
- [x] Rate resolution funguje ✅

### Cost Items:
- [x] Pridať grafika 250€ → external_cost +250€ ✅
- [x] Suma sa počíta správne ✅

### UI/UX:
- [x] Toast notifikácie fungujú ✅
- [x] Tabuľka sa refreshuje ✅
- [x] Footer zobrazuje správne sumy ✅

---

**Ak všetko funguje → HOTOVO! 🎉**

