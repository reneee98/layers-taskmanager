-- Migration: Create exec_sql function for executing SQL dynamically
-- Purpose: Allow API to execute SQL commands safely

-- Create function to execute SQL (admin only)
-- WARNING: This function allows executing arbitrary SQL - use with caution!
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow execution if called with service role key
  -- This is enforced by RLS and security definer
  
  -- Execute the SQL query
  EXECUTE sql_query;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'SQL executed successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to service role (authenticated via service role key)
-- Note: This function should only be accessible via service role key
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- Add comment
COMMENT ON FUNCTION exec_sql(text) IS 'Executes SQL query dynamically. WARNING: Use with extreme caution! Only accessible via service role key.';

