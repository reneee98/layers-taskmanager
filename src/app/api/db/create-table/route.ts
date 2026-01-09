import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/service";

/**
 * API endpoint for creating tables directly
 * Uses Supabase service role key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableName, columns, sql } = body;

    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Service client not available. Check SUPABASE_SERVICE_ROLE_KEY." 
      }, { status: 500 });
    }

    let sqlToExecute = '';

    if (sql) {
      // Use provided SQL directly
      sqlToExecute = sql;
    } else if (tableName && columns) {
      // Build CREATE TABLE statement
      const columnsDef = Array.isArray(columns) 
        ? columns.map((col: any) => {
            if (typeof col === 'string') {
              return col;
            }
            // Handle column object: { name, type, constraints }
            const constraints = col.default ? ` DEFAULT ${col.default}` : '';
            const nullable = col.nullable === false ? ' NOT NULL' : '';
            return `${col.name} ${col.type}${constraints}${nullable}`;
          }).join(', ')
        : columns;

      sqlToExecute = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsDef});`;
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Either sql or both tableName and columns are required" 
      }, { status: 400 });
    }

    // Try to execute via Supabase RPC function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Supabase configuration missing" 
      }, { status: 500 });
    }

    try {
      // Try using exec_sql RPC function
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ sql_query: sqlToExecute }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RPC call failed: ${errorText}`);
      }

      const result = await response.json();

      return NextResponse.json({ 
        success: result.success !== false, 
        message: result.message || "Table created successfully",
        sql: sqlToExecute,
        error: result.error
      });
    } catch (rpcError: any) {
      // If exec_sql function doesn't exist, provide instructions
      return NextResponse.json({ 
        success: false,
        error: "exec_sql function not found",
        message: "Please run migration 0078_create_exec_sql_function.sql first",
        sql: sqlToExecute,
        note: "You can also execute this SQL manually in Supabase dashboard"
      }, { status: 501 });
    }
  } catch (error: any) {
    console.error("Error creating table:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

