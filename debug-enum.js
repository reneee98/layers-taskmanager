// Debug script to check user_role enum values
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEnum() {
  try {
    console.log('=== DEBUGGING USER_ROLE ENUM ===');
    
    // Try to insert a test profile with different role values
    const testRoles = ['user', 'admin', 'owner', 'designer'];
    
    for (const role of testRoles) {
      console.log(`\nTesting role: ${role}`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: '00000000-0000-0000-0000-000000000000',
          email: `test-${role}@example.com`,
          display_name: `Test ${role}`,
          avatar_url: null,
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.log(`  Error with role '${role}':`, insertError.message);
      } else {
        console.log(`  Success with role '${role}'`);
        
        // Clean up the test data
        await supabase
          .from('profiles')
          .delete()
          .eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }
    
  } catch (error) {
    console.error('Error in debugEnum:', error);
  }
}

debugEnum();