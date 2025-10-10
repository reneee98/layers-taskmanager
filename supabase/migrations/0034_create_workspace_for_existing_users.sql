-- Create workspace for existing users who don't have one
INSERT INTO public.workspaces (name, description, owner_id)
SELECT 
    COALESCE(p.display_name, split_part(u.email, '@', 1)) || '''s Workspace' as name,
    'Môj workspace' as description,
    u.id as owner_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.owner_id = u.id
)
AND u.email IS NOT NULL;
