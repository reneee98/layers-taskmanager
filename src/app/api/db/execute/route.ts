import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/service";

/**
 * API endpoint for executing SQL commands directly on the database
 * Uses service role key to bypass RLS
 * 
 * WARNING: This endpoint should be protected in production!
 * Only use for development/admin operations
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: "Service client not available. Check SUPABASE_SERVICE_ROLE_KEY environment variable." 
      }, { status: 500 });
    }

    const body = await request.json();
    const { sql, description } = body;

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: "SQL query is required" 
      }, { status: 400 });
    }

    // Execute SQL using RPC or direct query
    // Note: Supabase JS client doesn't support raw SQL directly
    // We need to use the REST API or create a function
    // For now, we'll use the REST API with service role key
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      }
    );

    // If RPC doesn't exist, try alternative approach
    if (!response.ok) {
      // Try using Supabase's query builder for DDL operations
      // For DDL (CREATE, ALTER, etc.), we need to use PostgREST or direct connection
      // Let's create a helper that uses pg library or Supabase's admin API
      
      return NextResponse.json({ 
        success: false, 
        error: "Direct SQL execution not available. Use migrations or create a database function.",
        note: "For DDL operations, create a migration file in supabase/migrations/"
      }, { status: 501 });
    }

    const result = await response.json();

    return NextResponse.json({ 
      success: true, 
      data: result,
      description: description || "SQL executed successfully"
    });
  } catch (error: any) {
    console.error("Error executing SQL:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

