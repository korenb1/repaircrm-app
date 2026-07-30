-- ============================================================
-- Seed data (device catalog + services + sample contacts)
-- ============================================================

-- Groups
insert into groups (name) values
  ('Смартфон'),         -- 1
  ('Ноутбук'),          -- 2
  ('Планшет'),          -- 3
  ('ПК / Моноблок'),    -- 4
  ('Принтер');          -- 5

-- Brands (group_id references the ids above)
insert into brands (group_id, name) values
  (1, 'Xiaomi'),        -- 1
  (1, 'Apple'),         -- 2
  (1, 'Samsung'),       -- 3
  (2, 'Lenovo'),        -- 4
  (2, 'Acer'),          -- 5
  (2, 'Apple'),         -- 6
  (5, 'Samsung');       -- 7

-- Models (brand_id references the ids above)
insert into models (brand_id, name) values
  (1, 'Redmi Note 8'),          -- 1
  (1, 'Redmi 23129RN51X'),      -- 2
  (2, 'iPhone 12'),             -- 3
  (3, 'Galaxy S21'),            -- 4
  (4, '320-15 (80XH00EHRK)'),   -- 5
  (5, 'Nitro 7 an715-51'),      -- 6
  (6, 'MacBook Air (Retina, 13, 2020)'), -- 7
  (7, 'ML-2165W');              -- 8

-- Modifications (model_id references the ids above)
insert into modifications (model_id, name) values
  (1, '4/64GB'),
  (1, '6/128GB'),
  (3, '64GB'),
  (3, '128GB'),
  (7, 'M1 256GB');

-- Services / products catalog
insert into service_catalog (kind, name, sku, price) values
  ('labor',   'Діагностика', 'DIAG', 0),
  ('labor',   'Діагностика, чистка від пилу', 'DIAG-CLEAN', 600),
  ('labor',   'Заміна екрану', 'SCR', 1200),
  ('labor',   'Заміна акумулятора', 'BAT', 800),
  ('service', 'Перепрошивка ПЗ', 'FW', 400),
  ('product', 'Захисне скло', 'GLASS', 150),
  ('product', 'Чохол', 'CASE', 200),
  ('product', 'Термопаста', 'TPASTE', 250);

-- Sample contacts
insert into contacts (type, first_name, last_name, phone, email, address, note) values
  ('person', 'Test Contact', '', '+380 (50) 123 45 67', NULL, NULL, '');
