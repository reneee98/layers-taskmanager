-- Check current role values
SELECT DISTINCT role, COUNT(*) as count
FROM workspace_members 
GROUP BY role;
