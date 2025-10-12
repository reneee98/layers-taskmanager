// Debug script to check users in database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUsers() {
  try {
    console.log('=== DEBUGGING USERS ===');
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    console.log('All profiles:', profiles);
    
    // Get all workspaces
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('*');
    
    if (workspacesError) {
      console.error('Error fetching workspaces:', workspacesError);
      return;
    }
    
    console.log('All workspaces:', workspaces);
    
    // Get all workspace members
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('*');
    
    if (membersError) {
      console.error('Error fetching workspace members:', membersError);
      return;
    }
    
    console.log('All workspace members:', members);
    
    // Get all task assignees
    const { data: assignees, error: assigneesError } = await supabase
      .from('task_assignees')
      .select('*');
    
    if (assigneesError) {
      console.error('Error fetching task assignees:', assigneesError);
      return;
    }
    
    console.log('All task assignees:', assignees);
    
    // Get all time entries
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select('*');
    
    if (timeEntriesError) {
      console.error('Error fetching time entries:', timeEntriesError);
      return;
    }
    
    console.log('All time entries:', timeEntries);
    
  } catch (error) {
    console.error('Error in debugUsers:', error);
  }
}

debugUsers();
