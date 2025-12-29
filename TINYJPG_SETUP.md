# TinyJPG API Setup

Tento projekt používa TinyJPG API pre automatickú kompresiu obrázkov.

## 🔑 Získanie API kľúča

1. Choď na [TinyJPG Developer](https://tinypng.com/developers)
2. Zaregistruj sa alebo sa prihlás
3. Vytvor nový API kľúč
4. Skopíruj API kľúč

## ⚙️ Konfigurácia

Pridaj API kľúč do `.env.local` súboru:

```bash
# TinyJPG API
TINYJPG_API_KEY=your_api_key_here
```

## 📊 Limity

- **Bezplatný plán**: 500 kompresií/mesiac
- **Platený plán**: od $0.009 za kompresiu

## 🔄 Fallback

Ak TinyJPG API nie je dostupné alebo zlyhá:
- Automaticky sa použije lokálna kompresia
- Obrázky sa stále nahrajú, len s menšou kompresiou

## 🎯 Podporované formáty

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

## 📈 Výhody TinyJPG

- **Vysoká kompresia**: 50-80% zmenšenie veľkosti
- **Zachovanie kvality**: Minimálna strata kvality
- **Rýchlosť**: Rýchla kompresia
- **Optimalizácia**: Automatická optimalizácia pre web

## 🚨 Dôležité poznámky

1. **API kľúč je potrebný** - bez neho sa používa lokálna kompresia
2. **Limity** - sleduj počet kompresií v TinyJPG dashboard
3. **Bezpečnosť** - nikdy necommit-uj API kľúč do git repozitára
4. **Fallback** - aplikácia funguje aj bez TinyJPG API
