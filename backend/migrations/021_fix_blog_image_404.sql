-- Migration 021: Fix broken 404 Unsplash image URL in blog_posts
UPDATE blog_posts
SET cover_image = 'https://images.unsplash.com/photo-1509365465982-25d11c17e812?w=800'
WHERE cover_image LIKE '%photo-1562440499-64b9a5a5595b%';
