-- Migration: Add dashboard permissions to permissions table
-- Purpose: Allow roles to have dashboard-specific permissions
-- Date: 2025-01-XX

-- Insert dashboard permissions into permissions table
-- These permissions will be available for role assignment

INSERT INTO permissions (name, resource, action, description) VALUES
  -- Main dashboard access
  ('pages.view_dashboard', 'pages', 'view_dashboard', 'Prístup k dashboardu'),
  
  -- Dashboard sections
  ('dashboard.show_stats_overview', 'dashboard', 'show_stats_overview', 'Zobraziť prehľad štatistík'),
  ('dashboard.show_tasks_section', 'dashboard', 'show_tasks_section', 'Zobraziť sekciu úloh'),
  ('dashboard.show_activities_section', 'dashboard', 'show_activities_section', 'Zobraziť sekciu aktivít'),
  ('dashboard.show_calendar_section', 'dashboard', 'show_calendar_section', 'Zobraziť sekciu kalendára'),
  ('dashboard.show_projects_section', 'dashboard', 'show_projects_section', 'Zobraziť sekciu projektov'),
  ('dashboard.show_clients_section', 'dashboard', 'show_clients_section', 'Zobraziť sekciu klientov'),
  
  -- Task tabs
  ('dashboard.show_tab_all_active', 'dashboard', 'show_tab_all_active', 'Zobraziť tab Všetky aktívne'),
  ('dashboard.show_tab_today', 'dashboard', 'show_tab_today', 'Zobraziť tab Dnes'),
  ('dashboard.show_tab_sent_to_client', 'dashboard', 'show_tab_sent_to_client', 'Zobraziť tab Odoslané klientovi'),
  ('dashboard.show_tab_in_progress', 'dashboard', 'show_tab_in_progress', 'Zobraziť tab V riešení'),
  ('dashboard.show_tab_unassigned', 'dashboard', 'show_tab_unassigned', 'Zobraziť tab Nezadané'),
  ('dashboard.show_tab_overdue', 'dashboard', 'show_tab_overdue', 'Zobraziť tab Prešli deadline'),
  ('dashboard.show_tab_upcoming', 'dashboard', 'show_tab_upcoming', 'Zobraziť tab Blížia sa'),
  
  -- Stats
  ('dashboard.show_stat_total_tasks', 'dashboard', 'show_stat_total_tasks', 'Zobraziť štatistiku Celkový počet úloh'),
  ('dashboard.show_stat_completed_tasks', 'dashboard', 'show_stat_completed_tasks', 'Zobraziť štatistiku Dokončené úlohy'),
  ('dashboard.show_stat_in_progress_tasks', 'dashboard', 'show_stat_in_progress_tasks', 'Zobraziť štatistiku Úlohy v riešení'),
  ('dashboard.show_stat_total_hours', 'dashboard', 'show_stat_total_hours', 'Zobraziť štatistiku Celkový počet hodín'),
  ('dashboard.show_stat_completion_rate', 'dashboard', 'show_stat_completion_rate', 'Zobraziť štatistiku Miera dokončenia'),
  ('dashboard.show_stat_todo_tasks', 'dashboard', 'show_stat_todo_tasks', 'Zobraziť štatistiku Na spracovanie'),
  ('dashboard.show_stat_overdue_tasks', 'dashboard', 'show_stat_overdue_tasks', 'Zobraziť štatistiku Prešli deadline'),
  ('dashboard.show_stat_upcoming_tasks', 'dashboard', 'show_stat_upcoming_tasks', 'Zobraziť štatistiku Blížia sa'),
  
  -- Header/Actions
  ('dashboard.show_quick_task_button', 'dashboard', 'show_quick_task_button', 'Zobraziť tlačidlo Rýchla úloha'),
  ('dashboard.show_workspace_invitations', 'dashboard', 'show_workspace_invitations', 'Zobraziť pozvánky do workspace'),
  
  -- Task table columns
  ('dashboard.show_task_title_column', 'dashboard', 'show_task_title_column', 'Zobraziť stĺpec Názov úlohy'),
  ('dashboard.show_task_project_column', 'dashboard', 'show_task_project_column', 'Zobraziť stĺpec Projekt'),
  ('dashboard.show_task_assignees_column', 'dashboard', 'show_task_assignees_column', 'Zobraziť stĺpec Pridelené'),
  ('dashboard.show_task_status_column', 'dashboard', 'show_task_status_column', 'Zobraziť stĺpec Status'),
  ('dashboard.show_task_priority_column', 'dashboard', 'show_task_priority_column', 'Zobraziť stĺpec Priorita'),
  ('dashboard.show_task_deadline_column', 'dashboard', 'show_task_deadline_column', 'Zobraziť stĺpec Deadline'),
  ('dashboard.show_task_actions_column', 'dashboard', 'show_task_actions_column', 'Zobraziť stĺpec Akcie'),
  
  -- View modes
  ('dashboard.show_view_mode_toggle', 'dashboard', 'show_view_mode_toggle', 'Zobraziť prepínač zobrazenia'),
  ('dashboard.show_calendar_view_toggle', 'dashboard', 'show_calendar_view_toggle', 'Zobraziť prepínač kalendára'),
  ('dashboard.allow_list_view', 'dashboard', 'allow_list_view', 'Povoliť zobrazenie zoznamu'),
  ('dashboard.allow_calendar_view', 'dashboard', 'allow_calendar_view', 'Povoliť zobrazenie kalendára'),
  
  -- Activities
  ('dashboard.show_activity_view_all_link', 'dashboard', 'show_activity_view_all_link', 'Zobraziť odkaz Zobraziť všetky aktivity'),
  ('dashboard.show_activity_count', 'dashboard', 'show_activity_count', 'Zobraziť počet aktivít'),
  
  -- Task actions
  ('dashboard.allow_task_edit', 'dashboard', 'allow_task_edit', 'Povoliť úpravu úloh'),
  ('dashboard.allow_task_delete', 'dashboard', 'allow_task_delete', 'Povoliť mazanie úloh'),
  ('dashboard.allow_task_status_change', 'dashboard', 'allow_task_status_change', 'Povoliť zmenu statusu úloh'),
  ('dashboard.allow_task_priority_change', 'dashboard', 'allow_task_priority_change', 'Povoliť zmenu priority úloh'),
  ('dashboard.allow_task_assignee_change', 'dashboard', 'allow_task_assignee_change', 'Povoliť zmenu pridelených úloh'),
  
  -- Filtering/Sorting
  ('dashboard.allow_task_filtering', 'dashboard', 'allow_task_filtering', 'Povoliť filtrovanie úloh'),
  ('dashboard.allow_task_sorting', 'dashboard', 'allow_task_sorting', 'Povoliť triedenie úloh')
ON CONFLICT (name) DO NOTHING;

