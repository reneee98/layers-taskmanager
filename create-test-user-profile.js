// Script to create profile for test user
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUserProfile() {
  try {
    console.log('=== CREATING TEST USER PROFILE ===');
    
    const testUserId = 'c6e43e09-ffb0-46b5-8048-ea8d28fbf026';
    const testUserEmail = 'test@example.com'; // We'll use a placeholder email
    
    // Try to create profile for test user
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: testUserId,
        email: testUserEmail,
        display_name: 'Testovaci user',
        avatar_url: null,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error creating test user profile:', insertError);
      
      // If RLS error, try to create with service role
      if (insertError.code === '42501') {
        console.log('RLS error - need service role key to create profile');
        console.log('Please run this in Supabase SQL Editor:');
        console.log(`
INSERT INTO public.profiles (id, email, display_name, avatar_url, role, created_at, updated_at)
VALUES (
  '${testUserId}',
  '${testUserEmail}',
  'Testovaci user',
  null,
  'user',
  NOW(),
  NOW()
);
        `);
      }
    } else {
      console.log('Successfully created test user profile:', insertData);
    }
    
    // Check if profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single();
    
    if (profileError) {
      console.error('Error fetching test user profile:', profileError);
    } else {
      console.log('Test user profile:', profile);
    }
    
  } catch (error) {
    console.error('Error in createTestUserProfile:', error);
  }
}

createTestUserProfile();
