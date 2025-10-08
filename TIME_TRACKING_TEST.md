# ⏱️ Time Tracking Test Guide

## ✅ Implementované Features

### TimePanel Komponent (`src/components/time/TimePanel.tsx`)

**Features:**
- ⏲️ **Timer** - Start/Stop časovač s live odpočítavaním
- ✍️ **Manuálny zápis** - Pridanie hodín bez časovača
- 💰 **Rate Resolution** - Automatický alebo manuálny výber hodinovej sadzby
- 📊 **Zoznam záznamov** - Prehľad všetkých time entries s labor cost
- 🗑️ **Delete** - Vymazanie záznamu

### UI Komponenty:
1. **Timer Card:**
   - Výber úlohy
   - Live časovač (HH:MM:SS)
   - Start/Stop tlačidlá

2. **Manual Entry Card:**
   - Hodiny (number input, krok 0.25)
   - Dátum (date picker, default: dnes)
   - Hodinová sadzba (optional - auto-resolve ak prázdne)
   - Poznámka (textarea)

3. **Time Entries Table:**
   - Dátum
   - Úloha
   - User (avatar + meno)
   - Trvanie (formatované hodiny)
   - Sadzba (€/h)
   - Subtotal (€)
   - Poznámka
   - Delete button

4. **Summary:**
   - Celkom hodín
   - Labor cost (suma všetkých amounts)

## 🧪 Test Scenár

### Predpoklad:
- Máte projekt s ID
- Projekt má aspoň 1 úlohu
- RLS je vypnuté (alebo správne nastavené)

### Test Steps:

**1. Otvorte projekt detail:**
```
http://localhost:3000/projects/PROJECT_ID
```

**2. Kliknite na tab "Čas"**

**3. Manuálny zápis - 2 hodiny:**
- Zadajte: `2` hodiny
- Dátum: nechajte dnešný
- Sadzba: nechajte prázdne (použije resolver)
- Poznámka: "Development work"
- Kliknite **"Pridať záznam"**

**4. Overte výsledok:**
- ✅ Toast notifikácia: "Pridaných 2.00 h • XX.XX €"
- ✅ Záznam sa zobrazí v tabuľke
- ✅ Labor cost > 0 (v summary)

**5. Test s vlastnou sadzbou:**
- Zadajte: `1.5` hodiny
- Sadzba: `120`
- Kliknite **"Pridať záznam"**

**6. Overte:**
- ✅ Subtotal = 1.5 × 120 = 180€
- ✅ Labor cost sa zvýšil

**7. Test Timer:**
- Vyberte úlohu
- Kliknite **Start**
- Počkajte 10 sekúnd
- Kliknite **Stop**
- ✅ Automaticky vytvorí záznam s ~0.003h (10s / 3600s)

**8. Delete záznam:**
- Kliknite na 🗑️ ikonu
- Potvrďte
- ✅ Záznam zmizne
- ✅ Labor cost sa prepočíta

## 📊 Akceptačné Kritériá - OVERENIE

### ✅ Zadám 2h → labor_cost > 0

**Postup:**
1. Otvorte `/projects/[id]` → tab "Čas"
2. Zadajte `2` hodiny
3. Kliknite "Pridať záznam"
4. **Overte Summary:**
   ```
   Celkom hodín: 2.00 h
   Labor cost: XXX.XX €  ← MUSÍ BYŤ > 0
   ```

**Očakávané:**
- Ak máte nastavenú sadzbu v `project_members` → použije ju
- Ak máte sadzbu v `rates` → použije ju
- Ak nič → fallback 0 (labor_cost = 0€)

### ✅ S vlastnou sadzbou 120€/h:

```
Vstup:  2h @ 120€/h
Výstup: Labor cost = 240€
```

## 🔍 Debugging

### Ak labor_cost = 0:

1. **Skontrolujte rate resolution:**
   - Pozrite console log pri vytvorení záznamu
   - Mal by vypísať `rateSource: "project_member" | "rates_table" | "fallback"`

2. **Ak je fallback:**
   - Pridajte manuálnu sadzbu do formulára
   - Alebo nastavte `project_members.hourly_rate`
   - Alebo vytvorte záznam v `rates` tabuľke

3. **Test rate resolver:**
   ```bash
   # V projekte spustite:
   npm test -- src/server/rates/resolveHourlyRate.test.ts
   ```

### Ak sa záznam nevytvorí:

1. **Check network tab:**
   - POST `/api/tasks/[id]/time`
   - Pozrite response error

2. **Common issues:**
   - Task neexistuje
   - Project_id neexistuje
   - RLS blokuje INSERT
   - Validation error (hours < 0, atď)

## 📈 Finance Snapshot

Po vytvorení záznamu by mal endpoint vrátiť:

```json
{
  "success": true,
  "data": {
    "timeEntry": { ... },
    "rateSource": "project_member",
    "financeSnapshot": {
      "project_id": "...",
      "billable_hours": 2.0,
      "labor_cost": 240.0,
      "external_cost": 0,
      "fee_amount": 0,
      "total_price": 240.0,
      "margin": 0,
      "margin_pct": 0
    }
  }
}
```

**labor_cost** = suma všetkých `time_entries.amount` pre projekt

## 🎯 Hotovo!

**Implementované:**
- ✅ TimePanel s timer + manual entry
- ✅ Rate resolution (auto alebo manual)
- ✅ Time entries table so summary
- ✅ Labor cost výpočet
- ✅ Delete functionality

**Routes:**
- ✅ `POST /api/tasks/[id]/time` - Create
- ✅ `GET /api/tasks/[id]/time` - List
- ✅ `DELETE /api/time-entries/[id]` - Delete

**UI:**
- ✅ `/projects/[id]` → tab "Čas"
- ✅ Timer card
- ✅ Manual entry card
- ✅ Entries table
- ✅ Summary (hodiny + labor cost)

