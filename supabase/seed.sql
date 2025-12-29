-- Seed Data for Testing
-- This script creates sample clients, projects, and tasks for development/testing

-- Clean existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM time_entries;
-- DELETE FROM cost_items;
-- DELETE FROM tasks;
-- DELETE FROM project_members;
-- DELETE FROM projects;
-- DELETE FROM clients;

-- Insert sample clients
INSERT INTO clients (id, name, email, phone, tax_id, address, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Corporation', 'contact@acme.com', '+421 900 111 111', '12345678', 'Bratislava, Slovensko', 'Hlavný klient pre IT projekty'),
  ('22222222-2222-2222-2222-222222222222', 'TechStart s.r.o.', 'info@techstart.sk', '+421 900 222 222', '87654321', 'Košice, Slovensko', 'Startup zameraný na AI'),
  ('33333333-3333-3333-3333-333333333333', 'Global Solutions', 'hello@global.com', '+421 900 333 333', '11223344', 'Žilina, Slovensko', 'Medzinárodná firma')
ON CONFLICT (id) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (
  id, 
  client_id, 
  name, 
  code,
  description, 
  status, 
  currency,
  start_date, 
  end_date, 
  budget_hours, 
  budget_amount, 
  hourly_rate, 
  fixed_fee,
  fee_markup_pct,
  external_costs_budget
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'E-commerce Platform',
    'ECOM-2024',
    'Vývoj modernej e-commerce platformy s React a Next.js',
    'active',
    'EUR',
    '2024-01-15',
    '2024-06-30',
    500.000,
    50000.00,
    100.00,
    NULL,
    15.00,
    5000.00
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'AI Chatbot Integration',
    'AI-BOT-001',
    'Integrácia AI chatbota do existujúceho systému',
    'active',
    'EUR',
    '2024-02-01',
    '2024-04-30',
    200.000,
    25000.00,
    125.00,
    NULL,
    20.00,
    2000.00
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Mobile App Redesign',
    'MOBILE-2024',
    'Redesign mobilnej aplikácie pre iOS a Android',
    'draft',
    'EUR',
    '2024-03-01',
    '2024-08-31',
    300.000,
    35000.00,
    110.00,
    5000.00,
    10.00,
    3000.00
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'Data Analytics Dashboard',
    'DASH-2024',
    'Vytvorenie dashboard pre analýzu dát',
    'completed',
    'EUR',
    '2023-11-01',
    '2024-01-31',
    150.000,
    18000.00,
    120.00,
    NULL,
    12.00,
    1000.00
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for E-commerce Platform
INSERT INTO tasks (
  id,
  project_id,
  parent_task_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  due_date,
  order_index
) VALUES
  -- Root tasks
  (
    'task-001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'Frontend Development',
    'Vývoj frontend časti aplikácie',
    'active',
    'high',
    150.000,
    '2024-04-15',
    0
  ),
  (
    'task-002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'Backend API',
    'Vytvorenie REST API',
    'active',
    'high',
    120.000,
    '2024-04-01',
    1
  ),
  (
    'task-003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'Database Design',
    'Návrh databázovej schémy',
    'done',
    'urgent',
    40.000,
    '2024-02-15',
    2
  ),
  (
    'task-004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'Testing & QA',
    'Testovanie a quality assurance',
    'todo',
    'medium',
    80.000,
    '2024-06-15',
    3
  ),
  -- Sub-tasks for Frontend Development
  (
    'task-005',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-001',
    'Product Listing Page',
    'Implementácia stránky so zoznamom produktov',
    'done',
    'high',
    25.000,
    '2024-03-20',
    0
  ),
  (
    'task-006',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-001',
    'Shopping Cart',
    'Nákupný košík s real-time update',
    'active',
    'high',
    30.000,
    '2024-04-05',
    1
  ),
  (
    'task-007',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-001',
    'Checkout Flow',
    'Proces objednávky a platby',
    'todo',
    'high',
    35.000,
    '2024-04-15',
    2
  ),
  -- Sub-tasks for Backend API
  (
    'task-008',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-002',
    'User Authentication',
    'JWT autentifikácia',
    'done',
    'urgent',
    20.000,
    '2024-03-10',
    0
  ),
  (
    'task-009',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-002',
    'Payment Integration',
    'Integrácia Stripe platobnej brány',
    'active',
    'high',
    30.000,
    '2024-03-25',
    1
  )
ON CONFLICT (id) DO NOTHING;

-- Insert tasks for AI Chatbot Integration
INSERT INTO tasks (
  id,
  project_id,
  parent_task_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  due_date,
  order_index
) VALUES
  (
    'task-010',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NULL,
    'OpenAI Integration',
    'Napojenie na OpenAI API',
    'active',
    'urgent',
    40.000,
    '2024-03-15',
    0
  ),
  (
    'task-011',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NULL,
    'Chat UI Component',
    'React komponent pre chat rozhranie',
    'todo',
    'high',
    25.000,
    '2024-03-25',
    1
  ),
  (
    'task-012',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NULL,
    'Context Management',
    'Správa kontextu konverzácie',
    'todo',
    'medium',
    30.000,
    '2024-04-10',
    2
  )
ON CONFLICT (id) DO NOTHING;

-- Insert tasks for Mobile App Redesign
INSERT INTO tasks (
  id,
  project_id,
  parent_task_id,
  title,
  description,
  status,
  priority,
  estimated_hours,
  due_date,
  order_index
) VALUES
  (
    'task-013',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    NULL,
    'UI/UX Design',
    'Návrh nového dizajnu',
    'todo',
    'high',
    60.000,
    '2024-04-30',
    0
  ),
  (
    'task-014',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    NULL,
    'iOS Implementation',
    'Implementácia pre iOS',
    'todo',
    'medium',
    80.000,
    '2024-06-30',
    1
  ),
  (
    'task-015',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    NULL,
    'Android Implementation',
    'Implementácia pre Android',
    'todo',
    'medium',
    80.000,
    '2024-07-31',
    2
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample time entries (for actual_hours calculation)
INSERT INTO time_entries (
  project_id,
  task_id,
  user_id,
  date,
  hours,
  description,
  is_billable,
  hourly_rate
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-005',
    '11111111-1111-1111-1111-111111111111',
    '2024-03-15',
    8.000,
    'Implementácia product listing',
    TRUE,
    100.00
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-005',
    '11111111-1111-1111-1111-111111111111',
    '2024-03-16',
    7.500,
    'Dokončenie product listing',
    TRUE,
    100.00
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-006',
    '22222222-2222-2222-2222-222222222222',
    '2024-03-20',
    6.000,
    'Shopping cart základy',
    TRUE,
    110.00
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'task-008',
    '11111111-1111-1111-1111-111111111111',
    '2024-03-05',
    12.000,
    'JWT implementácia',
    TRUE,
    120.00
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'task-010',
    '22222222-2222-2222-2222-222222222222',
    '2024-03-01',
    10.000,
    'OpenAI API setup',
    TRUE,
    125.00
  )
ON CONFLICT DO NOTHING;

-- Insert sample cost items
INSERT INTO cost_items (
  project_id,
  name,
  description,
  category,
  amount,
  date,
  is_billable
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Stripe Monthly Fee',
    'Mesačný poplatok za Stripe',
    'software',
    49.00,
    '2024-03-01',
    TRUE
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'AWS Hosting',
    'Hosting na AWS',
    'hosting',
    125.00,
    '2024-03-01',
    TRUE
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'OpenAI API Credits',
    'API kredity pre OpenAI',
    'software',
    200.00,
    '2024-02-15',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- Summary
SELECT 'Seed data inserted successfully!' as message;
SELECT COUNT(*) as clients_count FROM clients;
SELECT COUNT(*) as projects_count FROM projects;
SELECT COUNT(*) as tasks_count FROM tasks;
SELECT COUNT(*) as time_entries_count FROM time_entries;
SELECT COUNT(*) as cost_items_count FROM cost_items;

