/**
 * Direct database connection utilities
 * Uses pg library for direct PostgreSQL connection
 * 
 * To use this, install: npm install pg @types/pg
 * And set DATABASE_URL environment variable
 */

let pgClient: any = null;

async function getPgClient() {
  // pg library is optional - only use if installed
  // For now, we'll use exec_sql RPC function instead
  throw new Error('Direct pg connection not available. Use exec_sql RPC function via helpers.ts instead.');
}

/**
 * Execute raw SQL query
 */
export async function executeSql(sql: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const client = await getPgClient();
    const result = await client.query(sql);
    
    return {
      success: true,
      data: result.rows || result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if a column exists in a table
 */
export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const client = await getPgClient();
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      );
    `, [tableName, columnName]);
    
    return result.rows[0]?.exists || false;
  } catch {
    return false;
  }
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const client = await getPgClient();
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = $1
      );
    `, [tableName]);
    
    return result.rows[0]?.exists || false;
  } catch {
    return false;
  }
}

/**
 * Create a table with the given schema
 */
export async function createTable(tableName: string, schema: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema});`;
    const result = await executeSql(sql);
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Add a column to a table
 */
export async function addColumn(tableName: string, columnName: string, columnType: string, defaultValue?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`;
    if (defaultValue !== undefined) {
      sql += ` DEFAULT ${defaultValue}`;
    }
    sql += ';';
    
    const result = await executeSql(sql);
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Close database connection
 */
export async function closeConnection() {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
  }
}

