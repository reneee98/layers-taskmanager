-- Migration: Simple invoice access restriction
-- Purpose: Only workspace owners can access invoices

-- First, check what tables exist
SELECT 'Existing tables:' as info, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%invoice%'
ORDER BY table_name;

-- Check if invoices table exists and add workspace_id if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
        -- Check if workspace_id column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'workspace_id' AND table_schema = 'public'
        ) THEN
            -- Add workspace_id column
            ALTER TABLE invoices ADD COLUMN workspace_id UUID;
            RAISE NOTICE 'Added workspace_id column to invoices table';
            
            -- Update existing records to use a default workspace (if any exists)
            UPDATE invoices 
            SET workspace_id = (SELECT id FROM workspaces LIMIT 1)
            WHERE workspace_id IS NULL;
            
            -- Make workspace_id NOT NULL after updating existing records
            ALTER TABLE invoices ALTER COLUMN workspace_id SET NOT NULL;
            
            -- Add foreign key constraint
            ALTER TABLE invoices 
            ADD CONSTRAINT fk_invoices_workspace_id 
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Updated existing invoices with workspace_id and added constraints';
        ELSE
            RAISE NOTICE 'workspace_id column already exists in invoices table';
        END IF;
        
        -- Enable RLS on invoices table
        ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on invoices table';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Allow workspace members to view invoices" ON invoices;
        DROP POLICY IF EXISTS "Allow workspace members to insert invoices" ON invoices;
        DROP POLICY IF EXISTS "Allow workspace members to update invoices" ON invoices;
        DROP POLICY IF EXISTS "Allow workspace members to delete invoices" ON invoices;
        DROP POLICY IF EXISTS "Owners can manage invoices" ON invoices;
        DROP POLICY IF EXISTS "Members can view invoices" ON invoices;
        DROP POLICY IF EXISTS "Only owners can view invoices" ON invoices;
        DROP POLICY IF EXISTS "Only owners can insert invoices" ON invoices;
        DROP POLICY IF EXISTS "Only owners can update invoices" ON invoices;
        DROP POLICY IF EXISTS "Only owners can delete invoices" ON invoices;
        
        -- Create RLS policies for invoices - ONLY OWNERS can access
        CREATE POLICY "Only owners can view invoices" ON invoices
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can insert invoices" ON invoices
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can update invoices" ON invoices
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          ) WITH CHECK (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can delete invoices" ON invoices
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = invoices.workspace_id AND owner_id = auth.uid()
            )
          );
        
        RAISE NOTICE 'RLS policies created for invoices table';
    ELSE
        RAISE NOTICE 'Invoices table does not exist, skipping RLS setup';
    END IF;
END $$;

-- Verify RLS is enabled and policies are active
SELECT 'Final RLS status:' as info, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'invoices' AND schemaname = 'public';

-- Show active policies
SELECT 'Active policies:' as info, schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE tablename = 'invoices' AND schemaname = 'public'
ORDER BY policyname;

-- Add comments for documentation
COMMENT ON TABLE invoices IS 'Invoices table with RLS enabled - only workspace owners can access invoices';
