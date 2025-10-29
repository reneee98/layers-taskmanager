# Test Workspace Access - Debug Instructions

Po pridaní `SUPABASE_SERVICE_ROLE_KEY` do Vercel projektu:

1. **Počkaj na redeploy** (alebo spusti manuálne Redeploy)

2. **Skús debug endpoint v konzole:**
```javascript
fetch('/api/debug/workspaces').then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
```

3. **Očakávané výsledky:**
- `serviceClientAvailable: true` ✅
- `serviceKeyConfigured: true` ✅
- `serviceKeyLength: > 0` ✅
- `serviceKeyStartsWithEyJ: true` ✅
- `layersWorkspaceMembership.exists: true` ✅
- `getUserAccessibleWorkspacesResult.count: 2` (jej workspace + Layers) ✅

4. **Ak niečo nie je správne**, skontroluj:
- Či je `SUPABASE_SERVICE_ROLE_KEY` správne nastavené v projekte
- Či bol spustený redeploy po pridaní premennej
- Či je Valentina v `workspace_members` (skús `ensure_valentina_in_layers.sql` v Supabase)

