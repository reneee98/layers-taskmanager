# Nastavenie Figma MCP Servera v Cursor

## 📋 Prehľad

Figma MCP server umožňuje pripojenie Figma k Cursor IDE, čím môžeš pracovať s Figma dizajnom priamo v editore.

## 🔧 Možnosti nastavenia

### Možnosť 1: Desktopový MCP Server (Odporúčané)

**Výhody:**
- Rýchlejšie pripojenie
- Lokálne spustenie
- Lepšia bezpečnosť

**Postup:**

1. **Nainštaluj Figma Desktop App** (ak ešte nemáš)
   - Stiahni z: https://www.figma.com/downloads/

2. **Otvori Figma súbor a aktivuj Dev Mode**
   - Otvor Figma súbor v desktopovej aplikácii
   - Klikni na prepínač "Dev Mode" v nástrojovej lište
   - V pravom paneli klikni na "Povoliť desktopový MCP server"
   - Zobrazí sa lokálna adresa (napr. `http://127.0.0.1:3845/mcp`)

3. **Nastav v Cursor:**
   
   **Cesta k settings súboru (macOS):**
   ```
   ~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
   ```

   **Alebo cez Cursor UI:**
   - Settings (Cmd+,)
   - Features
   - Model Context Protocol
   - Add Server

4. **Pridaj konfiguráciu:**
   
   ```json
   {
     "mcpServers": {
       "figma-desktop": {
         "url": "http://127.0.0.1:3845/mcp"
       }
     }
   }
   ```

### Možnosť 2: Vzdialený MCP Server (cez prehliadač)

**Postup:**

1. **Otvori Figma v prehliadači**
   - Choď na https://www.figma.com
   - Otvor Design súbor

2. **Aktivuj Dev Mode**
   - Klikni na prepínač "Dev Mode"
   - V pravom paneli klikni na "Nastaviť MCP klienta"
   - Vyber "Cursor"

3. **Postupuj podľa inštrukcií** zobrazených v Figma

### Možnosť 3: NPM Package (Ak potrebuješ API token)

**Postup:**

1. **Získaj Figma Access Token:**
   - Choď na https://www.figma.com/developers/api#access-tokens
   - Vytvor nový Personal Access Token
   - Skopíruj token

2. **Nastav v Cursor:**

   ```json
   {
     "mcpServers": {
       "figma": {
         "command": "npx",
         "args": [
           "-y",
           "@figma/mcp-server-figma"
         ],
         "env": {
           "FIGMA_ACCESS_TOKEN": "tvoj_figma_token_tu"
         }
       }
     }
   }
   ```

## 📝 Kde nájsť Cursor MCP settings

**macOS:**
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Windows:**
```
%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

**Linux:**
```
~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

## ✅ Overenie

Po nastavení:
1. Reštartuj Cursor
2. Otvor Figma súbor
3. Skús použiť MCP funkcie v Cursor

## 🔗 Užitočné odkazy

- [Figma MCP Dokumentácia](https://help.figma.com/hc/en-us/articles/35280968300439-Figma-MCP-collection-What-is-the-Figma-MCP-server)
- [Figma MCP Katalóg](https://www.figma.com/mcp-catalog/)
- [Nastavenie Desktop MCP Servera](https://help.figma.com/hc/en-us/articles/35281186390679-Figma-MCP-collection-How-to-setup-the-Figma-desktop-MCP-server)
- [Nastavenie Remote MCP Servera](https://help.figma.com/hc/en-us/articles/35281350665623-Figma-MCP-collection-How-to-set-up-the-Figma-remote-MCP-server)

## ⚠️ Bezpečnostné poznámky

- Nikdy necommit-uj Figma Access Token do git repozitára
- Používaj najnovšie verzie MCP servera (min. 0.6.3)
- Desktopový server je bezpečnejší ako vzdialený



