-- Force remove renkomoravec@gmail.com from Layers workspace
-- This uses SECURITY DEFINER to bypass RLS

-- Step 1: Check current status
SELECT 
    'BEFORE REMOVAL - Current status' as step,
    p.id as user_id,
    p.email,
    wm.id as member_id,
    wm.workspace_id,
    wm.role,
    w.name as workspace_name,
    w.owner_id,
    CASE 
        WHEN w.owner_id = p.id THEN 'IS OWNER - cannot remove'
        WHEN wm.id IS NOT NULL THEN 'IS MEMBER - can remove'
        ELSE 'NOT IN WORKSPACE'
    END as status
FROM profiles p
CROSS JOIN workspaces w
LEFT JOIN workspace_members wm ON wm.user_id = p.id AND wm.workspace_id = w.id
WHERE p.email = 'renkomoravec@gmail.com'
  AND w.id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';

-- Step 2: Create a function to force remove (bypasses RLS)
CREATE OR REPLACE FUNCTION force_remove_user_from_workspace(
    p_user_email TEXT,
    p_workspace_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_deleted_count INT;
BEGIN
    -- Find user by email
    SELECT id INTO v_user_id
    FROM profiles
    WHERE email = p_user_email;
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Check if user is owner
    IF EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = p_workspace_id AND owner_id = v_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot remove workspace owner. You must change workspace owner first.'
        );
    END IF;
    
    -- Delete from workspace_members
    DELETE FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = v_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', 'User removed successfully',
        'user_id', v_user_id,
        'email', p_user_email,
        'deleted_count', v_deleted_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Execute the function
SELECT force_remove_user_from_workspace(
    'renkomoravec@gmail.com',
    '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'::UUID
);

-- Step 4: Verify removal
SELECT 
    'AFTER REMOVAL - Verification' as step,
    p.id as user_id,
    p.email,
    wm.id as member_id,
    CASE 
        WHEN wm.id IS NULL THEN '✅ Successfully removed'
        ELSE '❌ Still exists in workspace_members'
    END as status
FROM profiles p
LEFT JOIN workspace_members wm ON wm.user_id = p.id 
    AND wm.workspace_id = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0'
WHERE p.email = 'renkomoravec@gmail.com';

-- Step 5: Clean up - drop the function
DROP FUNCTION IF EXISTS force_remove_user_from_workspace(TEXT, UUID);

