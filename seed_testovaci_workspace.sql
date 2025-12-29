-- Seed Dummy Data for "testovaci user" workspace
-- Tento skript naplní workspace "testovaci user" dummy dátami na testovanie

-- 1. Nájdeme workspace "testovaci user" alebo používateľa s emailom obsahujúcim "test"
DO $$
DECLARE
  test_workspace_id UUID;
  test_user_id UUID;
  client1_id UUID := gen_random_uuid();
  client2_id UUID := gen_random_uuid();
  client3_id UUID := gen_random_uuid();
  project1_id UUID := gen_random_uuid();
  project2_id UUID := gen_random_uuid();
  project3_id UUID := gen_random_uuid();
BEGIN
  -- Nájdeme workspace podľa mena alebo owner emailu
  SELECT w.id, w.owner_id INTO test_workspace_id, test_user_id
  FROM workspaces w
  LEFT JOIN profiles p ON p.id = w.owner_id
  WHERE LOWER(w.name) LIKE '%test%' 
     OR LOWER(p.email) LIKE '%test%'
     OR LOWER(w.name) LIKE '%testovaci%'
  LIMIT 1;

  -- Ak nenašiel workspace, vytvoríme ho pre prvého používateľa s "test" v emaile
  IF test_workspace_id IS NULL THEN
    SELECT id INTO test_user_id FROM profiles WHERE LOWER(email) LIKE '%test%' LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
      INSERT INTO workspaces (id, name, description, owner_id)
      VALUES (gen_random_uuid(), 'Testovaci Workspace', 'Workspace pre testovanie', test_user_id)
      RETURNING id INTO test_workspace_id;
      
      -- Pridáme používateľa ako člena workspace
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (test_workspace_id, test_user_id, 'owner')
      ON CONFLICT DO NOTHING;
    ELSE
      RAISE EXCEPTION 'Nenašiel sa workspace ani používateľ s "test" v mene/emaile. Vytvorte workspace ručne alebo upravte SQL.';
    END IF;
  END IF;

  RAISE NOTICE 'Workspace ID: %', test_workspace_id;
  RAISE NOTICE 'User ID: %', test_user_id;

  -- 2. VYMAŽEME STARÉ DÁTA (ak existujú)
  DELETE FROM time_entries WHERE project_id IN (
    SELECT id FROM projects WHERE workspace_id = test_workspace_id
  );
  DELETE FROM cost_items WHERE project_id IN (
    SELECT id FROM projects WHERE workspace_id = test_workspace_id
  );
  DELETE FROM task_assignees WHERE task_id IN (
    SELECT id FROM tasks WHERE project_id IN (
      SELECT id FROM projects WHERE workspace_id = test_workspace_id
    )
  );
  DELETE FROM task_comments WHERE task_id IN (
    SELECT id FROM tasks WHERE project_id IN (
      SELECT id FROM projects WHERE workspace_id = test_workspace_id
    )
  );
  DELETE FROM task_checklist_items WHERE task_id IN (
    SELECT id FROM tasks WHERE project_id IN (
      SELECT id FROM projects WHERE workspace_id = test_workspace_id
    )
  );
  DELETE FROM tasks WHERE project_id IN (
    SELECT id FROM projects WHERE workspace_id = test_workspace_id
  );
  DELETE FROM projects WHERE workspace_id = test_workspace_id;
  DELETE FROM clients WHERE workspace_id = test_workspace_id;

  -- 3. KLIENTI
  INSERT INTO clients (id, workspace_id, name, email, phone, tax_id, address, notes, created_by)
  VALUES
    (client1_id, test_workspace_id, 'Acme Corporation', 'contact@acme.com', '+421900111111', '12345678', 'Bratislava, Slovensko', 'Hlavný klient pre IT projekty', test_user_id),
    (client2_id, test_workspace_id, 'TechStart s.r.o.', 'info@techstart.sk', '+421900222222', '87654321', 'Košice, Slovensko', 'Startup zameraný na AI', test_user_id),
    (client3_id, test_workspace_id, 'Global Solutions', 'hello@global.com', '+421900333333', '11223344', 'Žilina, Slovensko', 'Medzinárodná firma', test_user_id);

  -- 4. PROJEKTY
  INSERT INTO projects (
    id, 
    workspace_id,
    client_id, 
    name, 
    code,
    description, 
    status, 
    start_date, 
    end_date, 
    budget_cents,
    hourly_rate_cents,
    fixed_fee,
    created_by
  ) VALUES
    (
      project1_id,
      test_workspace_id,
      client1_id,
      'E-commerce Platform',
      'ECOM-2024',
      'Vývoj modernej e-commerce platformy s React a Next.js',
      'active',
      CURRENT_DATE - INTERVAL '2 months',
      CURRENT_DATE + INTERVAL '4 months',
      5000000, -- 50,000 EUR v centoch
      10000,   -- 100 EUR/hod v centoch
      NULL,
      test_user_id
    ),
    (
      project2_id,
      test_workspace_id,
      client2_id,
      'AI Chatbot Integration',
      'AI-BOT-001',
      'Integrácia AI chatbota do existujúceho systému',
      'active',
      CURRENT_DATE - INTERVAL '1 month',
      CURRENT_DATE + INTERVAL '2 months',
      2500000, -- 25,000 EUR v centoch
      12500,   -- 125 EUR/hod v centoch
      NULL,
      test_user_id
    ),
    (
      project3_id,
      test_workspace_id,
      client3_id,
      'Mobile App Redesign',
      'MOBILE-2024',
      'Redesign mobilnej aplikácie pre iOS a Android',
      'active',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '6 months',
      3500000, -- 35,000 EUR v centoch
      11000,   -- 110 EUR/hod v centoch
      500000,  -- 5,000 EUR fixná suma v centoch
      test_user_id
    );

  -- 5. ÚLOHY
  INSERT INTO tasks (
    id,
    project_id,
    workspace_id,
    title,
    description,
    status,
    priority,
    estimated_hours,
    budget_cents,
    due_date,
    order_index,
    created_by
  ) VALUES
    -- E-commerce Platform
    (gen_random_uuid(), project1_id, test_workspace_id, 'Frontend Development', 'Vývoj frontend časti aplikácie', 'in_progress', 'high', 150.0, 1500000, CURRENT_DATE + INTERVAL '2 months', 0, test_user_id),
    (gen_random_uuid(), project1_id, test_workspace_id, 'Backend API', 'Vytvorenie REST API', 'in_progress', 'high', 120.0, 1200000, CURRENT_DATE + INTERVAL '1 month', 1, test_user_id),
    (gen_random_uuid(), project1_id, test_workspace_id, 'Database Design', 'Návrh databázovej schémy', 'done', 'urgent', 40.0, 400000, CURRENT_DATE - INTERVAL '1 month', 2, test_user_id),
    (gen_random_uuid(), project1_id, test_workspace_id, 'Testing & QA', 'Testovanie a quality assurance', 'todo', 'medium', 80.0, 800000, CURRENT_DATE + INTERVAL '4 months', 3, test_user_id),
    (gen_random_uuid(), project1_id, test_workspace_id, 'Product Listing Page', 'Implementácia stránky so zoznamom produktov', 'done', 'high', 25.0, 250000, CURRENT_DATE - INTERVAL '3 weeks', 4, test_user_id),
    (gen_random_uuid(), project1_id, test_workspace_id, 'Shopping Cart', 'Nákupný košík s real-time update', 'in_progress', 'high', 30.0, 300000, CURRENT_DATE + INTERVAL '1 week', 5, test_user_id),
    (gen_random_uuid(), project1_id, test_workspace_id, 'Checkout Flow', 'Proces objednávky a platby', 'todo', 'high', 35.0, 350000, CURRENT_DATE + INTERVAL '2 weeks', 6, test_user_id),
    (gen_random_uuid(), project1_id, test_workspace_id, 'User Authentication', 'JWT autentifikácia', 'done', 'urgent', 20.0, 200000, CURRENT_DATE - INTERVAL '1 month', 7, test_user_id),
    (gen_random_uuid(), project1_id, test_workspace_id, 'Payment Integration', 'Integrácia Stripe platobnej brány', 'in_progress', 'high', 30.0, 300000, CURRENT_DATE + INTERVAL '3 days', 8, test_user_id),
    
    -- AI Chatbot Integration
    (gen_random_uuid(), project2_id, test_workspace_id, 'OpenAI Integration', 'Napojenie na OpenAI API', 'in_progress', 'urgent', 40.0, 500000, CURRENT_DATE + INTERVAL '2 weeks', 0, test_user_id),
    (gen_random_uuid(), project2_id, test_workspace_id, 'Chat UI Component', 'React komponent pre chat rozhranie', 'todo', 'high', 25.0, 312500, CURRENT_DATE + INTERVAL '3 weeks', 1, test_user_id),
    (gen_random_uuid(), project2_id, test_workspace_id, 'Context Management', 'Správa kontextu konverzácie', 'todo', 'medium', 30.0, 375000, CURRENT_DATE + INTERVAL '1 month', 2, test_user_id),
    
    -- Mobile App Redesign
    (gen_random_uuid(), project3_id, test_workspace_id, 'UI/UX Design', 'Návrh nového dizajnu', 'todo', 'high', 60.0, 660000, CURRENT_DATE + INTERVAL '2 months', 0, test_user_id),
    (gen_random_uuid(), project3_id, test_workspace_id, 'iOS Implementation', 'Implementácia pre iOS', 'todo', 'medium', 80.0, 880000, CURRENT_DATE + INTERVAL '4 months', 1, test_user_id),
    (gen_random_uuid(), project3_id, test_workspace_id, 'Android Implementation', 'Implementácia pre Android', 'todo', 'medium', 80.0, 880000, CURRENT_DATE + INTERVAL '5 months', 2, test_user_id);

  -- 6. TIME ENTRIES (pre niektoré úlohy)
  INSERT INTO time_entries (
    project_id,
    task_id,
    workspace_id,
    user_id,
    date,
    hours,
    description,
    is_billable,
    hourly_rate,
    amount
  )
  SELECT 
    p.id as project_id,
    t.id as task_id,
    test_workspace_id,
    test_user_id,
    date_entry,
    hours_entry,
    desc_entry,
    TRUE,
    rate_entry::NUMERIC,
    (hours_entry * rate_entry)::NUMERIC as amount_entry
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  CROSS JOIN (
    VALUES
      (CURRENT_DATE - INTERVAL '3 weeks', 8.0, 'Implementácia product listing', 100.00),
      (CURRENT_DATE - INTERVAL '2 weeks 6 days', 7.5, 'Dokončenie product listing', 100.00),
      (CURRENT_DATE - INTERVAL '2 weeks', 6.0, 'Shopping cart základy', 100.00),
      (CURRENT_DATE - INTERVAL '1 month', 12.0, 'JWT implementácia', 100.00),
      (CURRENT_DATE - INTERVAL '2 weeks', 10.0, 'OpenAI API setup', 125.00),
      (CURRENT_DATE - INTERVAL '1 week', 5.0, 'Stripe integračná práca', 100.00),
      (CURRENT_DATE - INTERVAL '3 days', 4.0, 'Payment flow testovanie', 100.00)
  ) AS entries(date_entry, hours_entry, desc_entry, rate_entry)
  WHERE t.workspace_id = test_workspace_id
    AND (
      (t.title LIKE '%Product Listing%' AND p.id = project1_id)
      OR (t.title LIKE '%Shopping Cart%' AND p.id = project1_id)
      OR (t.title LIKE '%User Authentication%' AND p.id = project1_id)
      OR (t.title LIKE '%OpenAI%' AND p.id = project2_id)
      OR (t.title LIKE '%Payment Integration%' AND p.id = project1_id)
    )
  LIMIT 7;

  -- 7. COST ITEMS
  INSERT INTO cost_items (
    project_id,
    workspace_id,
    name,
    description,
    category,
    amount,
    date,
    is_billable
  ) VALUES
    (project1_id, test_workspace_id, 'Stripe Monthly Fee', 'Mesačný poplatok za Stripe', 'software', 49.00, CURRENT_DATE - INTERVAL '1 month', TRUE),
    (project1_id, test_workspace_id, 'AWS Hosting', 'Hosting na AWS', 'hosting', 125.00, CURRENT_DATE - INTERVAL '1 month', TRUE),
    (project2_id, test_workspace_id, 'OpenAI API Credits', 'API kredity pre OpenAI', 'software', 200.00, CURRENT_DATE - INTERVAL '2 weeks', TRUE),
    (project3_id, test_workspace_id, 'Design Tools Subscription', 'Mesačný poplatok za Figma', 'software', 15.00, CURRENT_DATE, TRUE);

  -- 8. TASK ASSIGNEES (priradíme niektoré úlohy používateľovi)
  INSERT INTO task_assignees (task_id, user_id, workspace_id, assigned_by)
  SELECT t.id, test_user_id, test_workspace_id, test_user_id
  FROM tasks t
  WHERE t.workspace_id = test_workspace_id
    AND t.status IN ('in_progress', 'todo')
  LIMIT 10;

  RAISE NOTICE 'Dummy dáta úspešne vložené! ✅';
END $$;

-- Zobrazenie súhrnu
SELECT 
  'KLIENTI' as table_name, 
  COUNT(*) as count 
FROM clients c
JOIN workspaces w ON w.id = c.workspace_id
WHERE LOWER(w.name) LIKE '%test%' OR LOWER(w.name) LIKE '%testovaci%'
UNION ALL
SELECT 
  'PROJEKTY', 
  COUNT(*) 
FROM projects p
JOIN workspaces w ON w.id = p.workspace_id
WHERE LOWER(w.name) LIKE '%test%' OR LOWER(w.name) LIKE '%testovaci%'
UNION ALL
SELECT 
  'ÚLOHY', 
  COUNT(*) 
FROM tasks t
JOIN projects p ON p.id = t.project_id
JOIN workspaces w ON w.id = p.workspace_id
WHERE LOWER(w.name) LIKE '%test%' OR LOWER(w.name) LIKE '%testovaci%'
UNION ALL
SELECT 
  'TIME ENTRIES', 
  COUNT(*) 
FROM time_entries te
JOIN projects p ON p.id = te.project_id
JOIN workspaces w ON w.id = p.workspace_id
WHERE LOWER(w.name) LIKE '%test%' OR LOWER(w.name) LIKE '%testovaci%'
UNION ALL
SELECT 
  'COST ITEMS', 
  COUNT(*) 
FROM cost_items ci
JOIN projects p ON p.id = ci.project_id
JOIN workspaces w ON w.id = p.workspace_id
WHERE LOWER(w.name) LIKE '%test%' OR LOWER(w.name) LIKE '%testovaci%';

-- Zobrazenie úloh s projektmi
SELECT 
  p.name as project,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  t.estimated_hours,
  t.budget_cents
FROM tasks t
JOIN projects p ON p.id = t.project_id
JOIN workspaces w ON w.id = p.workspace_id
WHERE LOWER(w.name) LIKE '%test%' OR LOWER(w.name) LIKE '%testovaci%'
ORDER BY p.name, t.order_index;

