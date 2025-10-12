// Debug script to check auth.users
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for auth.users access

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAuthUsers() {
  try {
    console.log('=== DEBUGGING AUTH USERS ===');
    
    // Get all auth users
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
      return;
    }
    
    console.log('Auth users:', authUsers.users);
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    console.log('Profiles:', profiles);
    
    // Check if profiles exist for auth users
    if (authUsers.users && authUsers.users.length > 0) {
      console.log('\n=== CHECKING PROFILES FOR AUTH USERS ===');
      for (const user of authUsers.users) {
        const profile = profiles.find(p => p.id === user.id);
        console.log(`User ${user.email} (${user.id}):`, profile ? 'HAS PROFILE' : 'NO PROFILE');
        if (!profile) {
          console.log('  User data:', {
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error in debugAuthUsers:', error);
  }
}

debugAuthUsers();
