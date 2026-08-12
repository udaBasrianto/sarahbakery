-- 010_blog_posts_extended_columns.sql
-- Add missing columns to blog_posts required by seed_blog.sql & AdminBlogPage

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS keywords TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE;

UPDATE blog_posts SET store_id = 1 WHERE store_id IS NULL;
