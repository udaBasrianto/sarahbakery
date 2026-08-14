-- Migration 026: Set dabasrianto@gmail.com as Admin and Super Admin
UPDATE users 
SET role = 'admin' 
WHERE LOWER(email) = 'dabasrianto@gmail.com';

-- Insert into super_admins table
INSERT INTO super_admins (user_id)
SELECT id FROM users 
WHERE LOWER(email) = 'dabasrianto@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Also set as owner of store 1 if not assigned
UPDATE stores 
SET owner_id = (SELECT id FROM users WHERE LOWER(email) = 'dabasrianto@gmail.com' LIMIT 1)
WHERE id = 1 AND EXISTS (SELECT 1 FROM users WHERE LOWER(email) = 'dabasrianto@gmail.com');
