import { NextResponse } from "next/server";
import { executeSql, tableExists, columnExists } from "@/lib/db/helpers";

/**
 * Test endpoint to verify database connection and helper functions
 */
export async function GET() {
  try {
    const results: any = {
      connection: {},
      helpers: {},
    };

    // Test 1: Check Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

    results.connection = {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
      serviceKeyExists: !!serviceKey,
      databaseUrlExists: !!databaseUrl,
    };

    // Test 2: Check if exec_sql function exists
    try {
      const testResult = await executeSql('SELECT 1 as test;');
      results.helpers.execSqlAvailable = testResult.success;
      results.helpers.execSqlError = testResult.error;
    } catch (error: any) {
      results.helpers.execSqlAvailable = false;
      results.helpers.execSqlError = error.message;
    }

    // Test 3: Check if task_timers table exists
    const timersTableExists = await tableExists('task_timers');
    results.helpers.taskTimersTableExists = timersTableExists;

    // Test 4: Check if is_extra column exists
    if (timersTableExists) {
      const isExtraColumnExists = await columnExists('task_timers', 'is_extra');
      results.helpers.isExtraColumnExists = isExtraColumnExists;
    }

    return NextResponse.json({
      success: true,
      results,
      note: "If exec_sql is not available, run migration 0078_create_exec_sql_function.sql"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}


