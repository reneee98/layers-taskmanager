-- Migration: Add company fields to workspace
-- Purpose: Store company information in workspace

-- Add company fields to workspaces table
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_email VARCHAR(255);

-- Add comments
COMMENT ON COLUMN workspaces.company_name IS 'Názov firmy/spoločnosti';
COMMENT ON COLUMN workspaces.company_tax_id IS 'IČO/DIČ firmy';
COMMENT ON COLUMN workspaces.company_address IS 'Adresa firmy';
COMMENT ON COLUMN workspaces.company_phone IS 'Telefón firmy';
COMMENT ON COLUMN workspaces.company_email IS 'Email firmy';

