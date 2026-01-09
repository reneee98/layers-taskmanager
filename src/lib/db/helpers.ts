/**
 * Database helper functions for direct database operations
 * These functions can be used in API routes or server components
 */

import { createClient } from "@/lib/supabase/service";

/**
 * Execute SQL query using Supabase RPC function
 * Requires exec_sql function to be created in database (migration 0078)
 */
export async function executeSql(sql: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return {
        success: false,
        error: "Supabase configuration missing"
      };
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `RPC call failed: ${errorText}`
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a table with given columns
 */
export async function createTable(
  tableName: string, 
  columns: string[] | Array<{ name: string; type: string; nullable?: boolean; default?: string }>
): Promise<{ success: boolean; error?: string }> {
  const columnsDef = Array.isArray(columns) 
    ? columns.map((col: any) => {
        if (typeof col === 'string') {
          return col;
        }
        const constraints = col.default ? ` DEFAULT ${col.default}` : '';
        const nullable = col.nullable === false ? ' NOT NULL' : '';
        return `${col.name} ${col.type}${constraints}${nullable}`;
      }).join(', ')
    : columns;

  const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsDef});`;
  return await executeSql(sql);
}

/**
 * Add a column to a table
 */
export async function addColumn(
  tableName: string, 
  columnName: string, 
  columnType: string, 
  options?: { nullable?: boolean; default?: string }
): Promise<{ success: boolean; error?: string }> {
  let sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`;
  
  if (options?.default !== undefined) {
    sql += ` DEFAULT ${options.default}`;
  }
  
  if (options?.nullable === false) {
    sql += ' NOT NULL';
  }
  
  sql += ';';
  
  return await executeSql(sql);
}

/**
 * Check if a column exists in a table
 */
export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    // Use direct SQL query via exec_sql
    const sql = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND column_name = '${columnName}'
      ) as exists;
    `;
    
    const result = await executeSql(sql);
    
    // If exec_sql returns success, try to parse result
    if (result.success) {
      // exec_sql doesn't return data directly, so we'll use alternative approach
      // Try to query the column directly
      const testSql = `SELECT ${columnName} FROM ${tableName} LIMIT 0;`;
      const testResult = await executeSql(testSql);
      return testResult.success;
    }
    
    return false;
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

