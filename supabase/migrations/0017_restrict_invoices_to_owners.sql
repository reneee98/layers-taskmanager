-- Migration: Restrict invoices access to workspace owners only
-- Purpose: Only workspace owners can view and manage invoices, members cannot access them

-- First, check if invoices table exists and has RLS enabled
SELECT 'Invoices table status:' as info, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'invoices' AND schemaname = 'public';

-- Check invoices table structure
SELECT 'Invoices table structure:' as info, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add workspace_id column to invoices table if it doesn't exist
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
    ELSE
        RAISE NOTICE 'Invoices table does not exist, skipping RLS setup';
    END IF;
END $$;

-- Drop existing policies on invoices table
DROP POLICY IF EXISTS "Allow workspace members to view invoices" ON invoices;
DROP POLICY IF EXISTS "Allow workspace members to insert invoices" ON invoices;
DROP POLICY IF EXISTS "Allow workspace members to update invoices" ON invoices;
DROP POLICY IF EXISTS "Allow workspace members to delete invoices" ON invoices;
DROP POLICY IF EXISTS "Owners can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Members can view invoices" ON invoices;

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

-- Check if project_invoices table exists and restrict access if it does
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_invoices' AND table_schema = 'public') THEN
        -- Check if project_invoices has workspace_id column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'project_invoices' AND column_name = 'workspace_id' AND table_schema = 'public'
        ) THEN
            -- Add workspace_id column to project_invoices table
            ALTER TABLE project_invoices ADD COLUMN workspace_id UUID;
            RAISE NOTICE 'Added workspace_id column to project_invoices table';
            
            -- Update existing records to use a default workspace (if any exists)
            UPDATE project_invoices 
            SET workspace_id = (SELECT id FROM workspaces LIMIT 1)
            WHERE workspace_id IS NULL;
            
            -- Make workspace_id NOT NULL after updating existing records
            ALTER TABLE project_invoices ALTER COLUMN workspace_id SET NOT NULL;
            
            -- Add foreign key constraint
            ALTER TABLE project_invoices 
            ADD CONSTRAINT fk_project_invoices_workspace_id 
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Updated existing project_invoices with workspace_id and added constraints';
        END IF;
        
        ALTER TABLE project_invoices ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Allow workspace members to view project invoices" ON project_invoices;
        DROP POLICY IF EXISTS "Allow workspace members to insert project invoices" ON project_invoices;
        DROP POLICY IF EXISTS "Allow workspace members to update project invoices" ON project_invoices;
        DROP POLICY IF EXISTS "Allow workspace members to delete project invoices" ON project_invoices;
        DROP POLICY IF EXISTS "Owners can manage project invoices" ON project_invoices;
        DROP POLICY IF EXISTS "Members can view project invoices" ON project_invoices;
        
        -- Create RLS policies for project_invoices - ONLY OWNERS can access
        CREATE POLICY "Only owners can view project invoices" ON project_invoices
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = project_invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can insert project invoices" ON project_invoices
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = project_invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can update project invoices" ON project_invoices
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = project_invoices.workspace_id AND owner_id = auth.uid()
            )
          ) WITH CHECK (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = project_invoices.workspace_id AND owner_id = auth.uid()
            )
          );

        CREATE POLICY "Only owners can delete project invoices" ON project_invoices
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM workspaces 
              WHERE id = project_invoices.workspace_id AND owner_id = auth.uid()
            )
          );
        
        RAISE NOTICE 'RLS policies created for project_invoices table';
    ELSE
        RAISE NOTICE 'project_invoices table does not exist, skipping RLS setup';
    END IF;
END $$;

-- Verify RLS is enabled and policies are active
SELECT 'Final RLS status:' as info, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('invoices', 'project_invoices') AND schemaname = 'public'
ORDER BY tablename;

-- Show active policies
SELECT 'Active policies:' as info, schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE tablename IN ('invoices', 'project_invoices') AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Add comments for documentation
COMMENT ON TABLE invoices IS 'Invoices table with RLS enabled - only workspace owners can access invoices';
COMMENT ON TABLE project_invoices IS 'Project invoices table with RLS enabled - only workspace owners can access project invoices';
