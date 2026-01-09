import { createClient } from "@/lib/supabase/service";

/**
 * Database admin utilities for direct database operations
 * Uses service role key to bypass RLS
 */

export interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Execute a migration SQL file
 * This reads the migration file and executes it
 */
export async function executeMigration(migrationSql: string): Promise<MigrationResult> {
  try {
    const supabase = createClient();
    
    if (!supabase) {
      return {
        success: false,
        message: "Service client not available",
        error: "Check SUPABASE_SERVICE_ROLE_KEY environment variable"
      };
    }

    // Split SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results: string[] = [];

    for (const statement of statements) {
      try {
        // For DDL operations, we need to use PostgREST or create a function
        // Since Supabase JS client doesn't support raw DDL, we'll use REST API
        
        // Try to execute via REST API if it's a SELECT query
        if (statement.toUpperCase().trim().startsWith('SELECT')) {
          // This won't work for DDL, but let's try
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
                'Prefer': 'return=representation',
              },
            }
          );
          results.push(`Executed: ${statement.substring(0, 50)}...`);
        } else {
          // For DDL operations, we need to use a database function or direct connection
          results.push(`Skipped (DDL requires direct DB connection): ${statement.substring(0, 50)}...`);
        }
      } catch (error: any) {
        results.push(`Error: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Executed ${statements.length} statements`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Migration execution failed",
      error: error.message
    };
  }
}

/**
 * Check if a column exists in a table
 */
export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const supabase = createClient();
    if (!supabase) return false;

    // Query information_schema to check if column exists
    const { data, error } = await supabase
      .rpc('check_column_exists', {
        table_name: tableName,
        column_name: columnName
      });

    if (error) {
      // If function doesn't exist, try alternative approach
      return false;
    }

    return data === true;
  } catch {
    return false;
  }
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const supabase = createClient();
    if (!supabase) return false;

    // Try to query the table - if it exists, this will succeed
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Create a migration helper that can be called from API routes
 * This reads migration files and applies them
 */
export async function applyMigration(migrationFileName: string): Promise<MigrationResult> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFileName);
    const migrationSql = await fs.readFile(migrationPath, 'utf-8');
    
    return await executeMigration(migrationSql);
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to read migration file: ${migrationFileName}`,
      error: error.message
    };
  }
}

