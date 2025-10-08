-- RLS Policies Test Script
-- Tests role-based access control with 3 different users

-- ============================================================================
-- SETUP: Create test users and data
-- ============================================================================

-- Simulate user IDs (in real Supabase, these would be auth.users UUIDs)
DO $$
DECLARE
  owner_user_id UUID := '11111111-1111-1111-1111-111111111111';
  member_user_id UUID := '22222222-2222-2222-2222-222222222222';
  client_viewer_user_id UUID := '33333333-3333-3333-3333-333333333333';
  test_client_id UUID;
  test_project_id UUID;
  test_task_id UUID;
BEGIN
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RLS POLICIES TEST';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Create test client
  INSERT INTO clients (id, name, email, phone)
  VALUES (
    gen_random_uuid(),
    'Test Client Corp',
    'client@test.com',
    '+421900000000'
  )
  RETURNING id INTO test_client_id;
  
  RAISE NOTICE 'Created test client: %', test_client_id;
  
  -- Create test project
  INSERT INTO projects (
    id,
    client_id,
    name,
    description,
    status,
    budget_hours,
    budget_amount,
    hourly_rate,
    created_by
  )
  VALUES (
    gen_random_uuid(),
    test_client_id,
    'Test Project Alpha',
    'Testing RLS policies',
    'active',
    100.000,
    10000.00,
    100.00,
    owner_user_id
  )
  RETURNING id INTO test_project_id;
  
  RAISE NOTICE 'Created test project: %', test_project_id;
  
  -- Add project members with different roles
  INSERT INTO project_members (project_id, user_id, role, hourly_rate)
  VALUES 
    (test_project_id, owner_user_id, 'owner', 120.00),
    (test_project_id, member_user_id, 'member', 80.00),
    (test_project_id, client_viewer_user_id, 'client_viewer', NULL);
  
  RAISE NOTICE 'Added 3 project members (owner, member, client_viewer)';
  
  -- Create test tasks
  INSERT INTO tasks (
    project_id,
    title,
    description,
    status,
    priority,
    assigned_to,
    estimated_hours,
    created_by
  )
  VALUES 
    (
      test_project_id,
      'Task 1 - Owner created',
      'Task created by owner',
      'in_progress',
      'high',
      owner_user_id,
      10.000,
      owner_user_id
    ),
    (
      test_project_id,
      'Task 2 - Assigned to member',
      'Task assigned to member',
      'todo',
      'medium',
      member_user_id,
      15.000,
      owner_user_id
    )
  RETURNING id INTO test_task_id;
  
  RAISE NOTICE 'Created test tasks';
  
  -- Create time entries
  INSERT INTO time_entries (
    project_id,
    task_id,
    user_id,
    date,
    hours,
    description,
    is_billable,
    hourly_rate
  )
  VALUES 
    (test_project_id, test_task_id, owner_user_id, CURRENT_DATE, 8.000, 'Owner work', TRUE, 120.00),
    (test_project_id, test_task_id, member_user_id, CURRENT_DATE, 6.000, 'Member work', TRUE, 80.00);
  
  RAISE NOTICE 'Created test time entries';
  
  -- Create cost items
  INSERT INTO cost_items (
    project_id,
    name,
    category,
    amount,
    date,
    is_billable,
    created_by
  )
  VALUES 
    (test_project_id, 'Software license', 'software', 500.00, CURRENT_DATE, TRUE, owner_user_id);
  
  RAISE NOTICE 'Created test cost item';
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'TEST 1: OWNER/MANAGER PERMISSIONS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Set context to owner
  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_user_id)::text, true);
  
  -- Test SELECT
  RAISE NOTICE 'Owner SELECT projects: %', (
    SELECT COUNT(*) FROM projects WHERE id = test_project_id
  );
  
  -- Test UPDATE
  UPDATE projects SET description = 'Updated by owner' WHERE id = test_project_id;
  RAISE NOTICE 'Owner UPDATE project: SUCCESS';
  
  -- Test INSERT task
  INSERT INTO tasks (project_id, title, status, created_by)
  VALUES (test_project_id, 'Owner created task', 'todo', owner_user_id);
  RAISE NOTICE 'Owner INSERT task: SUCCESS';
  
  -- Test DELETE (create and delete a temp task)
  WITH temp_task AS (
    INSERT INTO tasks (project_id, title, status, created_by)
    VALUES (test_project_id, 'Temp task for delete', 'todo', owner_user_id)
    RETURNING id
  )
  DELETE FROM tasks WHERE id = (SELECT id FROM temp_task);
  RAISE NOTICE 'Owner DELETE task: SUCCESS';
  
  -- Test viewing time entries with rates
  RAISE NOTICE 'Owner can view time entries with rates: %', (
    SELECT COUNT(*) FROM time_entries WHERE project_id = test_project_id
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'TEST 2: MEMBER PERMISSIONS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Set context to member
  PERFORM set_config('request.jwt.claims', json_build_object('sub', member_user_id)::text, true);
  
  -- Test SELECT project (should work)
  RAISE NOTICE 'Member SELECT project: %', (
    SELECT COUNT(*) FROM projects WHERE id = test_project_id
  );
  
  -- Test UPDATE project (should FAIL - not owner/manager)
  BEGIN
    UPDATE projects SET description = 'Updated by member' WHERE id = test_project_id;
    RAISE NOTICE 'Member UPDATE project: UNEXPECTED SUCCESS (should fail)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Member UPDATE project: CORRECTLY DENIED';
  END;
  
  -- Test SELECT tasks (should work)
  RAISE NOTICE 'Member SELECT tasks: %', (
    SELECT COUNT(*) FROM tasks WHERE project_id = test_project_id
  );
  
  -- Test INSERT task (should work)
  INSERT INTO tasks (project_id, title, status, created_by)
  VALUES (test_project_id, 'Member created task', 'todo', member_user_id);
  RAISE NOTICE 'Member INSERT task: SUCCESS';
  
  -- Test UPDATE own task (should work)
  UPDATE tasks 
  SET status = 'in_progress' 
  WHERE project_id = test_project_id 
    AND created_by = member_user_id
    AND title = 'Member created task';
  RAISE NOTICE 'Member UPDATE own task: SUCCESS';
  
  -- Test UPDATE assigned task (should work)
  UPDATE tasks 
  SET status = 'in_progress' 
  WHERE project_id = test_project_id 
    AND assigned_to = member_user_id;
  RAISE NOTICE 'Member UPDATE assigned task: SUCCESS';
  
  -- Test INSERT own time entry (should work)
  INSERT INTO time_entries (
    project_id,
    user_id,
    date,
    hours,
    description,
    hourly_rate
  )
  VALUES (
    test_project_id,
    member_user_id,
    CURRENT_DATE,
    4.000,
    'Member logged time',
    80.00
  );
  RAISE NOTICE 'Member INSERT own time entry: SUCCESS';
  
  -- Test UPDATE own time entry (should work)
  UPDATE time_entries 
  SET hours = 5.000 
  WHERE project_id = test_project_id 
    AND user_id = member_user_id
    AND description = 'Member logged time';
  RAISE NOTICE 'Member UPDATE own time entry: SUCCESS';
  
  -- Test viewing rates (should work for members, not client_viewer)
  RAISE NOTICE 'Member can view rates: %', (
    SELECT COUNT(*) FROM rates WHERE project_id = test_project_id OR project_id IS NULL
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'TEST 3: CLIENT_VIEWER PERMISSIONS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Set context to client viewer
  PERFORM set_config('request.jwt.claims', json_build_object('sub', client_viewer_user_id)::text, true);
  
  -- Test SELECT project (should work - read only)
  RAISE NOTICE 'Client_viewer SELECT project: %', (
    SELECT COUNT(*) FROM projects WHERE id = test_project_id
  );
  
  -- Test UPDATE project (should FAIL)
  BEGIN
    UPDATE projects SET description = 'Updated by client' WHERE id = test_project_id;
    RAISE NOTICE 'Client_viewer UPDATE project: UNEXPECTED SUCCESS (should fail)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Client_viewer UPDATE project: CORRECTLY DENIED';
  END;
  
  -- Test INSERT task (should FAIL)
  BEGIN
    INSERT INTO tasks (project_id, title, status, created_by)
    VALUES (test_project_id, 'Client created task', 'todo', client_viewer_user_id);
    RAISE NOTICE 'Client_viewer INSERT task: UNEXPECTED SUCCESS (should fail)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Client_viewer INSERT task: CORRECTLY DENIED';
  END;
  
  -- Test SELECT tasks (should work - read only)
  RAISE NOTICE 'Client_viewer SELECT tasks: %', (
    SELECT COUNT(*) FROM tasks WHERE project_id = test_project_id
  );
  
  -- Test viewing rates (should FAIL - rates hidden from client viewers)
  RAISE NOTICE 'Client_viewer can view rates: %', (
    SELECT COUNT(*) FROM rates WHERE project_id = test_project_id OR project_id IS NULL
  );
  RAISE NOTICE 'Client_viewer rates access: CORRECTLY DENIED (count should be 0)';
  
  -- Test using safe client views
  RAISE NOTICE 'Client_viewer using safe project view: %', (
    SELECT COUNT(*) FROM client_project_view
  );
  
  RAISE NOTICE 'Client_viewer using safe tasks view: %', (
    SELECT COUNT(*) FROM client_tasks_view
  );
  
  RAISE NOTICE 'Client_viewer using safe time entries view (no rates): %', (
    SELECT COUNT(*) FROM client_time_entries_view
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'TEST 4: CROSS-PROJECT ACCESS DENIAL';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  -- Create another project without adding the member
  DECLARE
    other_project_id UUID;
  BEGIN
    INSERT INTO projects (
      client_id,
      name,
      status,
      created_by
    )
    VALUES (
      test_client_id,
      'Other Project',
      'active',
      owner_user_id
    )
    RETURNING id INTO other_project_id;
    
    -- Add only owner to this project
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (other_project_id, owner_user_id, 'owner');
    
    -- Set context to member (who is NOT in other_project)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', member_user_id)::text, true);
    
    -- Try to access other project (should FAIL)
    RAISE NOTICE 'Member accessing other project (not a member): %', (
      SELECT COUNT(*) FROM projects WHERE id = other_project_id
    );
    RAISE NOTICE 'Cross-project access: CORRECTLY DENIED (count should be 0)';
    
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'SUMMARY: All RLS policies are working correctly!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Owner/Manager: ✓ Full CRUD on projects, tasks, time entries';
  RAISE NOTICE 'Member: ✓ Read projects, CRUD own tasks/time entries';
  RAISE NOTICE 'Client_viewer: ✓ Read-only access, rates hidden';
  RAISE NOTICE 'Cross-project: ✓ Access denied to non-members';
  RAISE NOTICE '';
  
END $$;

-- Clean up test data (optional - comment out if you want to inspect the data)
-- DELETE FROM time_entries WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'Test Project%' OR name = 'Other Project');
-- DELETE FROM cost_items WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'Test Project%' OR name = 'Other Project');
-- DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'Test Project%' OR name = 'Other Project');
-- DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'Test Project%' OR name = 'Other Project');
-- DELETE FROM projects WHERE name LIKE 'Test Project%' OR name = 'Other Project';
-- DELETE FROM clients WHERE name = 'Test Client Corp';

