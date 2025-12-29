-- Insert Dummy Data - Jednoduché testové dáta
-- Pred spustením: VYPNITE RLS na všetkých tabuľkách!

-- 1. KLIENTI
INSERT INTO clients (id, name, email, phone, tax_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Corporation', 'contact@acme.com', '+421900111111', '12345678'),
  ('22222222-2222-2222-2222-222222222222', 'TechStart s.r.o.', 'info@techstart.sk', '+421900222222', '87654321'),
  ('33333333-3333-3333-3333-333333333333', 'Global Solutions', 'hello@global.com', '+421900333333', '11223344')
ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name, 
      email = EXCLUDED.email;

-- 2. PROJEKTY
INSERT INTO projects (id, client_id, name, description, status, budget_hours, budget_amount, hourly_rate) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'E-commerce Platform',
    'Vývoj modernej e-commerce platformy',
    'active',
    500,
    50000,
    100
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'AI Chatbot Integration',
    'Integrácia AI chatbota',
    'active',
    200,
    25000,
    125
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Mobile App Redesign',
    'Redesign mobilnej aplikácie',
    'draft',
    300,
    35000,
    110
  )
ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name;

-- 3. ÚLOHY (s order_index)
-- Najprv vyčistíme staré
DELETE FROM tasks WHERE project_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Potom vložíme nové
INSERT INTO tasks (project_id, title, description, status, priority, estimated_hours, order_index) VALUES
  -- E-commerce projekt
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Frontend Development', 'Vývoj frontend časti', 'in_progress', 'high', 150, 0),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Backend API', 'Vytvorenie REST API', 'in_progress', 'high', 120, 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Database Design', 'Návrh databázovej schémy', 'done', 'urgent', 40, 2),
  
  -- AI Chatbot projekt
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'OpenAI Integration', 'Napojenie na OpenAI API', 'in_progress', 'urgent', 40, 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Chat UI Component', 'React komponent pre chat', 'todo', 'high', 25, 1),
  
  -- Mobile App projekt
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'UI/UX Design', 'Návrh nového dizajnu', 'todo', 'high', 60, 0);

-- Výsledok
SELECT 'Dummy data inserted! ✅' as status;

SELECT 'KLIENTI:' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'PROJEKTY:', COUNT(*) FROM projects
UNION ALL
SELECT 'ÚLOHY:', COUNT(*) FROM tasks;

-- Zobraziť úlohy s order_index
SELECT 
  p.name as project,
  t.title,
  t.status,
  t.priority,
  t.order_index,
  t.estimated_hours
FROM tasks t
JOIN projects p ON p.id = t.project_id
ORDER BY p.name, t.order_index;

