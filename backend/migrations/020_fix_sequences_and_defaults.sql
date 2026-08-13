-- Migration 020: Sync primary key sequences & ensure default store/category

-- 1. Ensure default store & category exist
INSERT INTO stores (id, name, slug, status)
VALUES (1, 'Sarah Bakery', 'sarah-bakery', 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, slug)
VALUES (1, 'Umum', 'umum')
ON CONFLICT (id) DO NOTHING;

-- 2. Reset primary key sequences to prevent duplicate key errors on insert
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'products_id_seq') THEN
        PERFORM setval('products_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM products), false);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'product_images_id_seq') THEN
        PERFORM setval('product_images_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM product_images), false);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories_id_seq') THEN
        PERFORM setval('categories_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM categories), false);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'stores_id_seq') THEN
        PERFORM setval('stores_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM stores), false);
    END IF;
END $$;
