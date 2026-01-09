import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * API endpoint for applying migrations
 * Can apply a specific migration file or execute raw SQL
 * Uses direct PostgreSQL connection via pg library
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { migrationFile, sql } = body;

    let sqlToExecute = '';

    if (migrationFile) {
      // Read migration file
      const migrationPath = join(process.cwd(), 'supabase', 'migrations', migrationFile);
      sqlToExecute = await readFile(migrationPath, 'utf-8');
    } else if (sql) {
      sqlToExecute = sql;
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Either migrationFile or sql is required" 
      }, { status: 400 });
    }

    // Try to execute via Supabase RPC function (if exec_sql function exists)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase configuration missing",
        note: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      }, { status: 500 });
    }

    try {
      // Try using Supabase RPC to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ sql_query: sqlToExecute }),
      });

      const result = await response.json();

      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          message: "Migration executed successfully",
          data: result
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: result.error || "Failed to execute SQL"
        }, { status: 500 });
      }
    } catch (rpcError: any) {
      // If RPC fails, return error
      return NextResponse.json({ 
        success: false,
        error: "Failed to execute SQL via exec_sql function",
        details: rpcError.message,
        note: "Make sure migration 0078_create_exec_sql_function.sql has been run"
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Error in migrate endpoint:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Get list of available migrations
 */
export async function GET() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    return NextResponse.json({ 
      success: true, 
      migrations: sqlFiles 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

