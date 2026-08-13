# Layers Tracker pre macOS

Natívna menu-bar aplikácia na výber úlohy a meranie času do Layers Studio.

## Čo podporuje

- prihlásenie účtom z Layers Studio,
- viac workspace,
- vyhľadávanie aktívnych úloh,
- voliteľnú poznámku k meraniu,
- živý čas v menu bare,
- synchronizáciu aktívneho timeru každých 15 sekúnd,
- bezpečné uloženie relácie v macOS Keychain,
- automatické vytvorenie time entry po zastavení.

## Vývoj

1. Spustite webovú aplikáciu v koreňovom priečinku cez `npm run dev`.
2. V tomto priečinku spustite `swift run`.
3. V prihlasovacej obrazovke nechajte server `http://localhost:3001`.

## Vytvorenie `.app`

```bash
chmod +x build-app.sh
./build-app.sh
open "dist/Layers Tracker.app"
```

Predvolený server v zabalenom builde je `https://layers-studio.vercel.app`. Vlastnú adresu môžete nastaviť cez `LAYERS_API_BASE_URL`.

Výsledok sa vytvorí v `dist/Layers Tracker.app`. Skript používa lokálny ad-hoc podpis vhodný na interné testovanie. Na distribúciu ďalším ľuďom je potrebný Apple Developer podpis a notarizácia.
