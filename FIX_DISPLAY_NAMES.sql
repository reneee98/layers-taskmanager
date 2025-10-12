-- FIX DISPLAY_NAMES - Spustite toto v Supabase SQL Editor

-- 1. Skontroluj aktuálne profily
SELECT id, display_name, email FROM profiles LIMIT 5;

-- 2. Vyplň display_name z email adresy ak je prázdne
UPDATE profiles 
SET display_name = COALESCE(
  NULLIF(display_name, ''), 
  SPLIT_PART(email, '@', 1)
)
WHERE display_name IS NULL OR display_name = '';

-- 3. Skontroluj výsledky
SELECT id, display_name, email FROM profiles LIMIT 5;
