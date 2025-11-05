-- Delete project named "Test" or "TEST"
-- This will delete the project and all related tasks (if cascade is set up)

DELETE FROM projects 
WHERE LOWER(name) = 'test' 
  AND name != 'Osobné úlohy';

-- Check if project was deleted
SELECT * FROM projects WHERE LOWER(name) = 'test';

