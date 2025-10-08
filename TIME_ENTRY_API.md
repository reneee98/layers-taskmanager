# Time Entry API - Endpoints

## ✅ Implementované Routes

```
POST   /api/tasks/[id]/time          → Create time entry
GET    /api/tasks/[id]/time          → List time entries for task
GET    /api/time-entries/[id]        → Get time entry detail
PATCH  /api/time-entries/[id]        → Update time entry
DELETE /api/time-entries/[id]        → Delete time entry
```

## 📝 Create Time Entry

**Endpoint:** `POST /api/tasks/{taskId}/time`

### Request Body:
```json
{
  "hours": 3.5,
  "date": "2024-10-07",
  "description": "Frontend development",
  "hourly_rate": 120,           // Optional - ak chýba, použije resolver
  "is_billable": true,           // Optional - default: true
  "user_id": "uuid"              // Optional - default: auth user
}
```

### Response:
```json
{
  "success": true,
  "data": {
    "timeEntry": {
      "id": "uuid",
      "task_id": "uuid",
      "user_id": "uuid",
      "hours": 3.5,
      "date": "2024-10-07",
      "description": "Frontend development",
      "hourly_rate": 120,
      "amount": 420,
      "is_billable": true,
      "created_at": "2024-10-07T10:00:00Z"
    },
    "rateSource": "project_member",   // alebo "rates_table" alebo "fallback"
    "financeSnapshot": {
      "project_id": "uuid",
      "billable_hours": 10.5,
      "labor_cost": 1260,
      "total_price": 1500,
      "margin": 240,
      "margin_pct": 16
    }
  }
}
```

## 📊 Finance Snapshot

Po každom CREATE/UPDATE/DELETE sa automaticky vráti aktualizovaný finance snapshot z `project_finance_view`:

- `billable_hours` - celkové hodiny
- `labor_cost` - náklady na prácu
- `external_cost` - externé náklady
- `fee_amount` - fee/markup
- `total_price` - celková cena
- `margin` - marža (€)
- `margin_pct` - marža (%)

## 🔧 Hourly Rate Resolution

### Priorita:
1. **Manual override** - ak je `hourly_rate` v requeste
2. **project_members.hourly_rate** - špeciálna sadzba pre projekt
3. **rates table** - user-specific alebo project-specific rate
4. **Fallback: 0**

### Príklady:

**1. S manuálnou sadzbou:**
```bash
curl -X POST http://localhost:3000/api/tasks/task-001/time \
  -H "Content-Type: application/json" \
  -d '{
    "hours": 3.5,
    "date": "2024-10-07",
    "hourly_rate": 150
  }'
# → Použije 150€/h
```

**2. Bez sadzby (auto-resolve):**
```bash
curl -X POST http://localhost:3000/api/tasks/task-001/time \
  -H "Content-Type: application/json" \
  -d '{
    "hours": 3.5,
    "date": "2024-10-07"
  }'
# → Zavolá resolveHourlyRate(userId, projectId)
# → rateSource: "project_member" | "rates_table" | "fallback"
```

## 🔄 Update Time Entry

**Endpoint:** `PATCH /api/time-entries/{id}`

### Request:
```json
{
  "hours": 4.0,                 // Optional
  "date": "2024-10-08",         // Optional
  "description": "Updated",     // Optional
  "hourly_rate": 125,           // Optional
  "is_billable": false          // Optional
}
```

### Logika:
- Ak zmeníš `hours` → prepočíta `amount`
- Ak zmeníš `hourly_rate` → prepočíta `amount`
- Inak zachová pôvodný `amount`

## 🗑️ Delete Time Entry

**Endpoint:** `DELETE /api/time-entries/{id}`

### Response:
```json
{
  "success": true,
  "data": {
    "financeSnapshot": { ... }
  }
}
```

## 📋 List Time Entries

**Endpoint:** `GET /api/tasks/{taskId}/time`

### Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "task_id": "uuid",
      "user_id": "uuid",
      "hours": 3.5,
      "date": "2024-10-07",
      "hourly_rate": 120,
      "amount": 420,
      ...
    }
  ]
}
```

## 🧪 Test Príkazy

### 1. Vytvor time entry (bez rate - použije resolver):
```bash
curl -X POST http://localhost:3000/api/tasks/TASK_ID/time \
  -H "Content-Type: application/json" \
  -d '{
    "hours": 3.5,
    "date": "2024-10-07",
    "description": "Development work"
  }'
```

### 2. Vytvor s vlastnou sadzbou:
```bash
curl -X POST http://localhost:3000/api/tasks/TASK_ID/time \
  -H "Content-Type: application/json" \
  -d '{
    "hours": 2.0,
    "date": "2024-10-07",
    "hourly_rate": 150
  }'
```

### 3. Update time entry:
```bash
curl -X PATCH http://localhost:3000/api/time-entries/TIME_ENTRY_ID \
  -H "Content-Type: application/json" \
  -d '{
    "hours": 4.0
  }'
```

### 4. Delete:
```bash
curl -X DELETE http://localhost:3000/api/time-entries/TIME_ENTRY_ID
```

## ⚙️ Side Effects

### Po CREATE/UPDATE/DELETE:

1. **Update task.actual_hours**
   ```sql
   CALL update_task_actual_hours(task_id);
   ```

2. **Return finance snapshot**
   ```sql
   SELECT * FROM project_finance_view 
   WHERE project_id = ?;
   ```

## ✅ Akceptačné Kritériá - SPLNENÉ

- ✅ POST endpoint pre manuálny zápis (3.5h)
- ✅ Ak `hourly_rate` chýba → zavolá resolver
- ✅ Uloží snapshot sadzby do `time_entries.hourly_rate`
- ✅ PATCH /api/time-entries/[id]
- ✅ DELETE /api/time-entries/[id]
- ✅ Endpoint vráti aktualizovaný finance snapshot

