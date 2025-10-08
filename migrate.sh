#!/bin/bash

# Migračný skript pre Supabase
# Použitie: ./migrate.sh

set -e

echo "🚀 Spúšťam migráciu Supabase databázy..."
echo ""

# Farby pre terminál
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Načítaj ENV premenné
source .env.local 2>/dev/null || true

# Kontrola ENV premenných
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo -e "${RED}❌ Chyba: NEXT_PUBLIC_SUPABASE_URL nie je nastavené v .env.local${NC}"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo -e "${RED}❌ Chyba: NEXT_PUBLIC_SUPABASE_ANON_KEY nie je nastavené v .env.local${NC}"
  exit 1
fi

# Extrahuj project ref z URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's|https://\([^.]*\)\.supabase\.co|\1|p')
echo -e "${BLUE}📦 Project: $PROJECT_REF${NC}"
echo ""

# Funkcia na spustenie SQL cez Supabase API
run_sql() {
  local sql_file=$1
  local description=$2
  
  echo -e "${BLUE}⏳ $description...${NC}"
  
  # Prečítaj SQL súbor
  SQL_CONTENT=$(cat "$sql_file")
  
  # Spusti cez Supabase REST API
  response=$(curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(jq -Rs . < "$sql_file")}" 2>&1)
  
  # Kontrola chyby (zjednodušená verzia - použijeme psql)
  echo -e "${GREEN}✓ Hotovo${NC}"
}

echo "════════════════════════════════════════════════════════════"
echo "  DÔLEŽITÉ: Migrácie musia byť spustené cez Supabase Dashboard"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Prejdite na:"
echo -e "${BLUE}https://supabase.com/dashboard/project/$PROJECT_REF/sql${NC}"
echo ""
echo "Potom postupne skopírujte a spustite:"
echo ""
echo -e "${GREEN}1. Init schema (tabuľky, indexy, views)${NC}"
echo "   📄 supabase/migrations/0001_init.sql"
echo ""
echo -e "${GREEN}2. Row Level Security (RLS politiky)${NC}"
echo "   📄 supabase/migrations/0002_rls.sql"
echo ""
echo -e "${GREEN}3. Seed data (dummy dáta)${NC}"
echo "   📄 supabase/seed.sql"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Alternatíva: Použite psql (ak máte nainštalované)"
echo ""
echo "Získajte connection string z Supabase:"
echo "Settings → Database → Connection string → URI"
echo ""
echo "Potom spustite:"
echo -e "${BLUE}psql 'postgresql://postgres:[PASSWORD]@...' -f supabase/migrations/0001_init.sql${NC}"
echo -e "${BLUE}psql 'postgresql://postgres:[PASSWORD]@...' -f supabase/migrations/0002_rls.sql${NC}"
echo -e "${BLUE}psql 'postgresql://postgres:[PASSWORD]@...' -f supabase/seed.sql${NC}"
echo ""

