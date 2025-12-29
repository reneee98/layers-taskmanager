-- COMPLETE SETUP - Všetko v jednom
-- Skopírujte CELÉ a spustite v Supabase SQL Editore

-- ============================================
-- 1. DISABLE RLS (pre vývoj)
-- ============================================
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rates DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. PRIDAŤ CHÝBAJÚCE STĹPCE (ak neexistujú)
-- ============================================

-- Projects: code, currency, fee_markup_pct
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'code') THEN
    ALTER TABLE projects ADD COLUMN code VARCHAR(50) UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'currency') THEN
    ALTER TABLE projects ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'fee_markup_pct') THEN
    ALTER TABLE projects ADD COLUMN fee_markup_pct NUMERIC(5, 2);
  END IF;
END $$;

-- Tasks: order_index
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tasks' AND column_name = 'order_index') THEN
    ALTER TABLE tasks ADD COLUMN order_index INTEGER DEFAULT 0;
    CREATE INDEX idx_tasks_order_index ON tasks(project_id, order_index);
  END IF;
END $$;

-- ============================================
-- 3. VYMAZAŤ EXISTUJÚCE DUMMY DATA
-- ============================================
DELETE FROM time_entries;
DELETE FROM cost_items;
DELETE FROM tasks;
DELETE FROM project_members;
DELETE FROM projects;
DELETE FROM clients;
DELETE FROM rates;

-- ============================================
-- 4. VLOŽIŤ KLIENTOV
-- ============================================
INSERT INTO clients (id, name, email, phone, tax_id, address, notes) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Acme Corporation',
    'contact@acme.com',
    '+421900111111',
    'SK12345678',
    'Bratislava, Slovensko',
    'Hlavný klient - e-commerce'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'TechStart s.r.o.',
    'info@techstart.sk',
    '+421900222222',
    'SK87654321',
    'Košice, Slovensko',
    'Startup AI projekty'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Global Solutions',
    'hello@global.com',
    '+421900333333',
    'SK11223344',
    'Žilina, Slovensko',
    'Mobilné aplikácie'
  );

-- ============================================
-- 5. VLOŽIŤ PROJEKTY
-- ============================================
INSERT INTO projects (
  id, client_id, name, code, description, status, currency,
  start_date, end_date, budget_hours, budget_amount, hourly_rate,
  fee_markup_pct
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'E-commerce Platform',
    'ECOM-2024',
    'Vývoj modernej e-commerce platformy s Next.js a Supabase',
    'active',
    'EUR',
    '2024-01-01',
    '2024-06-30',
    500,
    50000,
    100,
    15
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'AI Chatbot Integration',
    'AI-BOT-2024',
    'Integrácia AI chatbota do existujúceho systému',
    'active',
    'EUR',
    '2024-02-01',
    '2024-04-30',
    200,
    25000,
    125,
    20
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Mobile App Redesign',
    'MOBILE-2024',
    'Redesign mobilnej aplikácie - UI/UX',
    'draft',
    'EUR',
    '2024-03-01',
    '2024-05-31',
    300,
    35000,
    110,
    10
  );

-- ============================================
-- 6. VLOŽIŤ ÚLOHY (s order_index)
-- ============================================
INSERT INTO tasks (
  project_id, parent_task_id, title, description,
  status, priority, assigned_to, estimated_hours, 
  actual_hours, due_date, order_index
) VALUES
  -- E-commerce projekt
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'Frontend Development',
    'Vývoj frontend časti aplikácie s React/Next.js',
    'in_progress',
    'high',
    NULL,
    150,
    45.5,
    '2024-03-15',
    0
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'Backend API',
    'Vytvorenie REST API s autentifikáciou',
    'in_progress',
    'high',
    NULL,
    120,
    30.0,
    '2024-03-20',
    1
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'Database Design',
    'Návrh a implementácia databázovej schémy',
    'done',
    'urgent',
    NULL,
    40,
    42.0,
    '2024-02-28',
    2
  ),
  
  -- AI Chatbot projekt
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NULL,
    'OpenAI Integration',
    'Napojenie na OpenAI API a konfigurácia',
    'in_progress',
    'urgent',
    NULL,
    40,
    15.0,
    '2024-03-10',
    0
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NULL,
    'Chat UI Component',
    'React komponent pre chat rozhranie',
    'todo',
    'high',
    NULL,
    25,
    0,
    '2024-03-25',
    1
  ),
  
  -- Mobile App projekt
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    NULL,
    'UI/UX Design',
    'Návrh nového dizajnu aplikácie',
    'todo',
    'high',
    NULL,
    60,
    0,
    '2024-04-01',
    0
  );

-- ============================================
-- 7. VLOŽIŤ RATES (pre rate resolution)
-- ============================================
INSERT INTO rates (
  project_id, user_id, name, hourly_rate,
  valid_from, valid_to, is_default
) VALUES
  (
    NULL,
    NULL,
    'Default Developer Rate',
    100,
    '2024-01-01',
    NULL,
    true
  ),
  (
    NULL,
    NULL,
    'Senior Developer Rate',
    150,
    '2024-01-01',
    NULL,
    false
  );

-- ============================================
-- 8. VLOŽIŤ TIME ENTRIES (príklad)
-- ============================================
-- Získame ID úloh a vložíme time entries
DO $$ 
DECLARE
  task_frontend_id UUID;
  task_backend_id UUID;
  ecommerce_project_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
  -- Získame ID úloh podľa názvu
  SELECT id INTO task_frontend_id FROM tasks WHERE title = 'Frontend Development' LIMIT 1;
  SELECT id INTO task_backend_id FROM tasks WHERE title = 'Backend API' LIMIT 1;
  
  -- Vložíme time entries s project_id
  INSERT INTO time_entries (
    project_id, task_id, user_id, hours, date, description,
    hourly_rate, amount, is_billable
  ) VALUES
    (
      ecommerce_project_id,
      task_frontend_id,
      '00000000-0000-0000-0000-000000000000',
      8.0,
      '2024-10-01',
      'Initial setup and configuration',
      100,
      800,
      true
    ),
    (
      ecommerce_project_id,
      task_frontend_id,
      '00000000-0000-0000-0000-000000000000',
      6.5,
      '2024-10-02',
      'Component development',
      100,
      650,
      true
    ),
    (
      ecommerce_project_id,
      task_backend_id,
      '00000000-0000-0000-0000-000000000000',
      7.0,
      '2024-10-03',
      'API endpoints implementation',
      100,
      700,
      true
    );
  
  -- Update actual_hours for tasks
  UPDATE tasks SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0) 
    FROM time_entries 
    WHERE time_entries.task_id = tasks.id
  );
END $$;

-- ============================================
-- 9. VLOŽIŤ COST ITEMS (príklad)
-- ============================================
DO $$ 
DECLARE
  task_frontend_id UUID;
BEGIN
  SELECT id INTO task_frontend_id FROM tasks WHERE title = 'Frontend Development' LIMIT 1;
  
  INSERT INTO cost_items (
    project_id, task_id, name, description, category,
    amount, date, is_billable
  ) VALUES
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      task_frontend_id,
      'Logo design a brand identity',
      'Design štúdio - grafika pre projekt',
      'Graphics',
      300, -- 250€ + 20% DPH
      '2024-02-15',
      true
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      NULL,
      'OpenAI API kredity',
      'API kredity pre AI chatbot',
      'Licence',
      500,
      '2024-02-20',
      true
    );
END $$;

-- ============================================
-- 10. VÝSLEDKY
-- ============================================
SELECT '✅ SETUP COMPLETE!' as status;

SELECT 'KLIENTI:' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'PROJEKTY:', COUNT(*) FROM projects
UNION ALL
SELECT 'ÚLOHY:', COUNT(*) FROM tasks
UNION ALL
SELECT 'TIME ENTRIES:', COUNT(*) FROM time_entries
UNION ALL
SELECT 'COST ITEMS:', COUNT(*) FROM cost_items
UNION ALL
SELECT 'RATES:', COUNT(*) FROM rates;

-- Zobraziť projekty s finance snapshot
SELECT 
  p.name,
  p.code,
  p.status,
  COUNT(DISTINCT t.id) as tasks_count,
  COALESCE(SUM(te.amount), 0) as labor_cost,
  COALESCE(SUM(c.amount), 0) as external_cost,
  COALESCE(SUM(te.amount), 0) + COALESCE(SUM(c.amount), 0) as total_cost
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN time_entries te ON te.task_id = t.id
LEFT JOIN cost_items c ON c.project_id = p.id
GROUP BY p.id, p.name, p.code, p.status
ORDER BY p.name;

