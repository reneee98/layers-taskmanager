-- CREATE MOCK ACTIVITIES - Spustite toto v Supabase SQL Editor

-- 1. Vytvor viac používateľov
INSERT INTO profiles (id, display_name, email, role) VALUES
  (gen_random_uuid(), 'René Moravec', 'rene@example.com', 'owner'),
  (gen_random_uuid(), 'Jana Nováková', 'jana@example.com', 'member'),
  (gen_random_uuid(), 'Peter Kováč', 'peter@example.com', 'member'),
  (gen_random_uuid(), 'Anna Svobodová', 'anna@example.com', 'member'),
  (gen_random_uuid(), 'Martin Hruška', 'martin@example.com', 'member')
ON CONFLICT (email) DO NOTHING;

-- 2. Vytvor viac projektov s rôznymi autormi
INSERT INTO projects (id, name, code, description, status, created_by, workspace_id, created_at, updated_at) VALUES
  (gen_random_uuid(), 'E-commerce Platform', 'ECOMP-001', 'Online shop development', 'active', (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), 'Mobile App', 'MOBILE-002', 'iOS/Android app', 'active', (SELECT id FROM profiles WHERE display_name = 'Jana Nováková' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 hours'),
  (gen_random_uuid(), 'Website Redesign', 'WEB-003', 'Company website update', 'completed', (SELECT id FROM profiles WHERE display_name = 'Peter Kováč' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', NOW() - INTERVAL '1 week', NOW() - INTERVAL '30 minutes')
ON CONFLICT (code) DO NOTHING;

-- 3. Vytvor viac úloh s rôznymi autormi
INSERT INTO tasks (id, title, description, status, priority, created_by, workspace_id, project_id, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Design homepage', 'Create wireframes and mockups', 'in_progress', 'high', (SELECT id FROM profiles WHERE display_name = 'Anna Svobodová' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', (SELECT id FROM projects WHERE code = 'ECOMP-001' LIMIT 1), NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes'),
  (gen_random_uuid(), 'Setup database', 'Configure PostgreSQL and migrations', 'done', 'medium', (SELECT id FROM profiles WHERE display_name = 'Martin Hruška' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', (SELECT id FROM projects WHERE code = 'ECOMP-001' LIMIT 1), NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), 'API integration', 'Connect with payment gateway', 'todo', 'high', (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', (SELECT id FROM projects WHERE code = 'MOBILE-002' LIMIT 1), NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  (gen_random_uuid(), 'User testing', 'Conduct usability tests', 'review', 'low', (SELECT id FROM profiles WHERE display_name = 'Jana Nováková' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', (SELECT id FROM projects WHERE code = 'WEB-003' LIMIT 1), NOW() - INTERVAL '4 hours', NOW() - INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;

-- 4. Vytvor komentáre
INSERT INTO task_comments (id, content, user_id, task_id, workspace_id, created_at) VALUES
  (gen_random_uuid(), 'Skvelá práca na wireframe!', (SELECT id FROM profiles WHERE display_name = 'Peter Kováč' LIMIT 1), (SELECT id FROM tasks WHERE title = 'Design homepage' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', NOW() - INTERVAL '20 minutes'),
  (gen_random_uuid(), 'Potrebujeme ešte upraviť farby', (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1), (SELECT id FROM tasks WHERE title = 'Design homepage' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', NOW() - INTERVAL '10 minutes'),
  (gen_random_uuid(), 'Database je pripravená na produkciu', (SELECT id FROM profiles WHERE display_name = 'Martin Hruška' LIMIT 1), (SELECT id FROM tasks WHERE title = 'Setup database' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', NOW() - INTERVAL '45 minutes')
ON CONFLICT DO NOTHING;

-- 5. Vytvor time entries
INSERT INTO time_entries (id, hours, description, user_id, task_id, workspace_id, date, created_at) VALUES
  (gen_random_uuid(), 2.5, 'Worked on homepage design', (SELECT id FROM profiles WHERE display_name = 'Anna Svobodová' LIMIT 1), (SELECT id FROM tasks WHERE title = 'Design homepage' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', CURRENT_DATE, NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), 4.0, 'Database setup and testing', (SELECT id FROM profiles WHERE display_name = 'Martin Hruška' LIMIT 1), (SELECT id FROM tasks WHERE title = 'Setup database' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', CURRENT_DATE, NOW() - INTERVAL '2 hours'),
  (gen_random_uuid(), 1.5, 'API research and planning', (SELECT id FROM profiles WHERE display_name = 'René Moravec' LIMIT 1), (SELECT id FROM tasks WHERE title = 'API integration' LIMIT 1), '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', CURRENT_DATE, NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;

-- 6. Vytvor klientov
INSERT INTO clients (id, name, email, phone, workspace_id, created_at, updated_at) VALUES
  (gen_random_uuid(), 'TechCorp s.r.o.', 'info@techcorp.sk', '+421 2 1234 5678', '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'StartupXYZ', 'hello@startupxyz.com', '+421 2 8765 4321', '0727a4a2-b57f-437d-bf83-c4b6b5b633fe', NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- 7. Skontroluj výsledky
SELECT 'Profiles:' as info;
SELECT display_name, email FROM profiles;

SELECT 'Projects:' as info;
SELECT name, code, created_by FROM projects;

SELECT 'Tasks:' as info;
SELECT title, status, created_by FROM tasks;

SELECT 'Comments:' as info;
SELECT content, user_id FROM task_comments;

SELECT 'Time entries:' as info;
SELECT hours, description, user_id FROM time_entries;
