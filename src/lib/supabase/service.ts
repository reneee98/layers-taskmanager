import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Read environment variables at runtime (not at module load time)
// This ensures environment variables are available even if they're set after module load
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set - service client will not bypass RLS');
    console.warn('Service key check:', {
      exists: !!supabaseServiceKey,
      length: supabaseServiceKey?.length || 0,
      startsWith: supabaseServiceKey?.substring(0, 10) || 'N/A'
    });
    return null;
  }
  
  // Validate that the key looks correct (Supabase service role keys start with 'eyJ')
  if (!supabaseServiceKey.startsWith('eyJ')) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY does not look like a valid JWT token (should start with eyJ)');
    return null;
  }
  
  try {
    return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error('Failed to create service client:', error);
    return null;
  }
};
