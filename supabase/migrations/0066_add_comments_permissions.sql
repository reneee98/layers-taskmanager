-- Migration: Add comments permissions
-- Purpose: Add permissions for comments (create, read, update, delete)

-- Insert comments permissions
INSERT INTO permissions (name, description, resource, action) VALUES
  ('comments.create', 'Create new comments', 'comments', 'create'),
  ('comments.read', 'View comments', 'comments', 'read'),
  ('comments.update', 'Update comments', 'comments', 'update'),
  ('comments.delete', 'Delete comments', 'comments', 'delete'),
  ('comments.manage', 'Full comment management', 'comments', 'manage')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign comments permissions to owner and admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'owner'),
  id
FROM permissions
WHERE resource = 'comments'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin'),
  id
FROM permissions
WHERE resource = 'comments'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member role gets read permission for comments
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'member'),
  id
FROM permissions
WHERE resource = 'comments' AND action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

