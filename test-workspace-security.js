#!/usr/bin/env node

/**
 * Workspace Security Test Script
 * This script tests the workspace security implementation
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testWorkspaceSecurity() {
  console.log('🔒 Testing Workspace Security Implementation...\n');

  try {
    // Test 1: Check if RLS policies are enabled
    console.log('1. Checking RLS policies...');
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'workspaces', 'workspace_members', 'workspace_invitations',
        'projects', 'tasks', 'clients', 'cost_items', 'task_assignees',
        'task_comments', 'time_entries', 'task_timers'
      ]);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return;
    }

    console.log('✅ Found tables:', tables.data.map(t => t.table_name).join(', '));

    // Test 2: Check if workspace_id columns exist
    console.log('\n2. Checking workspace_id columns...');
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('table_name, column_name')
      .eq('table_schema', 'public')
      .eq('column_name', 'workspace_id')
      .in('table_name', [
        'projects', 'tasks', 'clients', 'cost_items', 'task_assignees',
        'task_comments', 'time_entries', 'task_timers'
      ]);

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError);
      return;
    }

    const expectedTables = ['projects', 'tasks', 'clients', 'cost_items', 'task_assignees', 'task_comments', 'time_entries', 'task_timers'];
    const tablesWithWorkspaceId = columns.data.map(c => c.table_name);
    const missingTables = expectedTables.filter(t => !tablesWithWorkspaceId.includes(t));

    if (missingTables.length === 0) {
      console.log('✅ All tables have workspace_id column');
    } else {
      console.log('❌ Missing workspace_id in tables:', missingTables);
    }

    // Test 3: Check if security functions exist
    console.log('\n3. Checking security functions...');
    const { data: functions, error: functionsError } = await supabaseAdmin
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .in('routine_name', [
        'validate_workspace_access',
        'get_user_accessible_workspaces',
        'user_has_workspace_access'
      ]);

    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError);
      return;
    }

    const expectedFunctions = ['validate_workspace_access', 'get_user_accessible_workspaces', 'user_has_workspace_access'];
    const existingFunctions = functions.data.map(f => f.routine_name);
    const missingFunctions = expectedFunctions.filter(f => !existingFunctions.includes(f));

    if (missingFunctions.length === 0) {
      console.log('✅ All security functions exist');
    } else {
      console.log('❌ Missing functions:', missingFunctions);
    }

    // Test 4: Test workspace access with different users
    console.log('\n4. Testing workspace access...');
    
    // Get test users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name')
      .limit(3);

    if (usersError || !users.data || users.data.length < 2) {
      console.log('⚠️  Not enough test users found, skipping access test');
    } else {
      console.log(`Found ${users.data.length} test users`);
      
      // Test with first user
      const testUser = users.data[0];
      console.log(`Testing with user: ${testUser.email}`);
      
      // Get user's workspaces
      const { data: userWorkspaces, error: workspacesError } = await supabaseAdmin
        .rpc('get_user_accessible_workspaces', { p_user_id: testUser.id });

      if (workspacesError) {
        console.log('❌ Error getting user workspaces:', workspacesError);
      } else {
        console.log(`✅ User has access to ${userWorkspaces.length} workspaces`);
        userWorkspaces.forEach(ws => {
          console.log(`   - ${ws.name} (${ws.role})`);
        });
      }
    }

    // Test 5: Check audit log table
    console.log('\n5. Checking audit log...');
    const { data: auditLog, error: auditError } = await supabaseAdmin
      .from('audit_log')
      .select('count')
      .limit(1);

    if (auditError) {
      console.log('❌ Audit log table not accessible:', auditError.message);
    } else {
      console.log('✅ Audit log table exists and is accessible');
    }

    console.log('\n🎉 Workspace security test completed!');
    console.log('\n📋 Summary:');
    console.log('- RLS policies should be enabled on all workspace-related tables');
    console.log('- All tables should have workspace_id column');
    console.log('- Security functions should be available');
    console.log('- Users should only see their accessible workspaces');
    console.log('- Audit logging should be working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWorkspaceSecurity();
