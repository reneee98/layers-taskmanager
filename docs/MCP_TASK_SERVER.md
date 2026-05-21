# MCP Task Server

Tento projekt má MCP server pre správu taskov v Layers Studio v dvoch formách:

- remote HTTP endpoint pre Vercel v [src/app/api/[transport]/route.ts](/Users/renemoravec/Documents/layers-studio/src/app/api/[transport]/route.ts), pričom MCP URL zostáva `/api/mcp`
- lokálny `stdio` runner v [scripts/mcp/layers-tasks-server.mjs](/Users/renemoravec/Documents/layers-studio/scripts/mcp/layers-tasks-server.mjs)

Oba entrypointy používajú tú istú task logiku a Supabase `service role`.

## Čo vie

- vyhľadávať projekty, používateľov a tasky
- vytvárať tasky
- editovať tasky
- uzatvárať tasky (`done` alebo `cancelled`)
- mazať tasky
- meniť assignees
- pridávať, upravovať a mazať komentáre
- pridávať, upravovať a mazať checklist položky

## Súbory

- Vercel route: [src/app/api/[transport]/route.ts](/Users/renemoravec/Documents/layers-studio/src/app/api/[transport]/route.ts)
- Lokálny runner: [scripts/mcp/layers-tasks-server.mjs](/Users/renemoravec/Documents/layers-studio/scripts/mcp/layers-tasks-server.mjs)
- NPM script pre lokálny runner: `npm run mcp:tasks`

## Potrebné env premenné

Používa sa existujúce Supabase nastavenie plus tieto premenné:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LAYERS_MCP_WORKSPACE_ID` - workspace, nad ktorým má MCP operovať
- `LAYERS_MCP_ACTOR_USER_ID` - odporúčané; user id pre audit logy, komentáre, `created_by`, `assigned_by`
- `LAYERS_MCP_API_TOKEN` - odporúčané pre remote/Vercel variant; ak je nastavený, endpoint vyžaduje Bearer token

Ak `LAYERS_MCP_ACTOR_USER_ID` nenastavíš, server vie čítať a upravovať tasky, ale nebude vedieť korektne zapisovať niektoré auditné dáta a nevytvorí komentár.

## Vercel endpoint

Po deployi bude MCP endpoint na:

```text
https://<deployment-domain>/api/mcp
```

Ak je nastavený `LAYERS_MCP_API_TOKEN`, endpoint očakáva `Authorization: Bearer <token>`.

## Lokálne spustenie

```bash
npm run mcp:tasks
```

## Príklad remote configu

```json
{
  "mcpServers": {
    "layers-tasks": {
      "url": "https://YOUR-DEPLOYMENT.vercel.app/api/mcp"
    }
  }
}
```

Ak klient nepodporuje remote MCP priamo, dá sa použiť `mcp-remote`:

```json
{
  "mcpServers": {
    "layers-tasks": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://YOUR-DEPLOYMENT.vercel.app/api/mcp"],
      "env": {
        "MCP_REMOTE_HEADERS": "{\"Authorization\":\"Bearer YOUR_TOKEN\"}"
      }
    }
  }
}
```

## Príklad lokálneho `stdio` configu

```json
{
  "mcpServers": {
    "layers-tasks": {
      "command": "node",
      "args": ["/Users/renemoravec/Documents/layers-studio/scripts/mcp/layers-tasks-server.mjs"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://YOUR-PROJECT.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY",
        "LAYERS_MCP_WORKSPACE_ID": "YOUR_WORKSPACE_UUID",
        "LAYERS_MCP_ACTOR_USER_ID": "YOUR_PROFILE_UUID"
      }
    }
  }
}
```

## Tooly

- `list_projects`
- `list_workspace_users`
- `list_tasks`
- `get_task`
- `format_task_description`
- `create_task`
- `update_task`
- `close_task`
- `delete_task`
- `set_task_assignees`
- `list_task_comments`
- `add_task_comment`
- `update_task_comment`
- `delete_task_comment`
- `list_task_checklist`
- `add_task_checklist_item`
- `update_task_checklist_item`
- `delete_task_checklist_item`

## AI formátovanie popisu úlohy

Tool `format_task_description` je určený pre flow, kde si AI model v chate sám prepíše text do peknej štruktúry a MCP server ho následne len bezpečne premení na HTML vhodné pre existujúci task editor v Layers Studio.

Vie:

- spraviť H1, H2, H3
- odstavce
- odrážky a číslované zoznamy
- citácie
- code blocky
- voliteľne výsledok rovno uložiť do `task.description`

Použitie:

- `raw_text` - text so štruktúrou v štýle Markdown
- `task` - task id alebo názov; ak `raw_text` nepošleš, použije sa existujúci popis tasku
- `apply_to_task` - keď je `true`, uloží vygenerované HTML priamo do tasku

Podporovaná syntax v `raw_text`:

- `#`, `##`, `###` pre nadpisy
- `-` alebo `*` pre odrážky
- `1.` pre číslované zoznamy
- `>` pre citácie
- triple backticks pre code block

Príklad:

```json
{
  "task": "Pripraviť onboarding pre klienta",
  "raw_text": "# Onboarding klienta\n\n## Čo potrebujeme od klienta\n- logo\n- brand farby\n- prístup do domény\n\n## Termín\n- deadline budúci štvrtok",
  "apply_to_task": true
}
```

Praktický flow:

- používateľ pošle do Claude chatu neformátovaný text
- Claude si ho interne prepíše do peknej štruktúry
- následne zavolá `format_task_description`
- server vráti `html` a podľa `apply_to_task` ho aj uloží do tasku

## Odporúčanie k bezpečnosti

- používaj samostatný `workspace_id`, nie globálne admin prostredie pre viac klientov naraz
- pre remote endpoint nastav `LAYERS_MCP_API_TOKEN`, inak bude preview verejne dostupné
- `service role` kľúč drž len vo Vercel env alebo inom bezpečnom secrets úložisku
- ak chceš neskôr jemnejšie permissiony, ďalší krok je vyrobiť MCP-aware interný API token model namiesto priameho `service role`
