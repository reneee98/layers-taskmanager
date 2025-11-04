-- Migration: Documentation for setting superadmin JWT claim
-- Purpose: Instructions for setting JWT claim app_role = 'superadmin' for René Moravec
-- Note: The is_superadmin() function is already created in migration 0045

-- To set superadmin JWT claim for René Moravec:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find user with email: design@renemoravec.sk or rene@renemoravec.sk
-- 3. Edit user > Raw App Meta Data
-- 4. Add: {"app_role": "superadmin"}
-- 5. Save changes
--
-- Alternatively, use Supabase Auth Admin API:
-- supabase.auth.admin.updateUserById(userId, {
--   app_metadata: { app_role: 'superadmin' }
-- })
--
-- The RLS policy in bugs table already supports both:
-- - JWT claim app_role = 'superadmin'
-- - Email check via is_superadmin() function

