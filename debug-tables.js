// Debug script to check table structure
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTables() {
  try {
    console.log('=== DEBUGGING TABLE STRUCTURE ===');
    
    // Check if profiles table exists
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('Profiles table error:', profilesError);
    } else {
      console.log('Profiles table exists, sample data:', profiles);
    }
    
    // Check if user_profiles table exists
    const { data: userProfiles, error: userProfilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (userProfilesError) {
      console.error('User_profiles table error:', userProfilesError);
    } else {
      console.log('User_profiles table exists, sample data:', userProfiles);
    }
    
    // Check auth users (this might not work with anon key)
    try {
      const { data: authUsers, error: authUsersError } = await supabase.auth.getUser();
      if (authUsersError) {
        console.log('Auth users error (expected with anon key):', authUsersError.message);
      } else {
        console.log('Current auth user:', authUsers.user);
      }
    } catch (error) {
      console.log('Auth users error (expected with anon key):', error.message);
    }
    
  } catch (error) {
    console.error('Error in debugTables:', error);
  }
}

debugTables();
