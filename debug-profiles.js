// Debug script to check profiles table structure
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProfiles() {
  try {
    console.log('=== DEBUGGING PROFILES TABLE ===');
    
    // Check profiles table structure
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Profiles table error:', profilesError);
    } else {
      console.log('Profiles table data:', profiles);
    }
    
    // Check user_profiles table data
    const { data: userProfiles, error: userProfilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (userProfilesError) {
      console.error('User_profiles table error:', userProfilesError);
    } else {
      console.log('User_profiles table data:', userProfiles);
    }
    
    // Try to manually insert data into profiles
    console.log('\n=== MANUALLY INSERTING DATA ===');
    
    if (userProfiles && userProfiles.length > 0) {
      for (const user of userProfiles) {
        console.log(`Inserting user: ${user.email}`);
        
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            display_name: user.name || user.email.split('@')[0],
            avatar_url: null,
            role: user.role === 'owner' ? 'owner' : 'user',
            created_at: user.created_at,
            updated_at: user.updated_at
          });
        
        if (insertError) {
          console.error(`Error inserting ${user.email}:`, insertError);
        } else {
          console.log(`Successfully inserted ${user.email}`);
        }
      }
    }
    
    // Check profiles table again
    const { data: profilesAfter, error: profilesAfterError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesAfterError) {
      console.error('Profiles table error after insert:', profilesAfterError);
    } else {
      console.log('Profiles table data after insert:', profilesAfter);
    }
    
  } catch (error) {
    console.error('Error in debugProfiles:', error);
  }
}

debugProfiles();
