import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type ServiceClientOptions = {
  noStore?: boolean;
};

// Read environment variables at runtime (not at module load time)
// This ensures environment variables are available even if they're set after module load
export const createClient = ({ noStore = false }: ServiceClientOptions = {}) => {
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
      },
      global: noStore
        ? {
            // Next.js patches global fetch and can otherwise reuse a prior
            // PostgREST GET result inside a dynamic route. Timer state must
            // always be read from Supabase afresh.
            fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
          }
        : undefined,
    });
  } catch (error) {
    console.error('Failed to create service client:', error);
    return null;
  }
};
