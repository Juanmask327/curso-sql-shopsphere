-- =============================================================
-- SHOPSPHERE SEED DATA — OPERACIONAL
-- Generado: 2026-05-31 (corregido por sql-data-analyst QA)
-- Contiene: inventory
-- Correcciones aplicadas:
--   - inventory: inventory_id (PK) agregado, stock_qty→stock,
--     last_updated→updated_at (TIMESTAMP), reorder_level eliminado
--   - Timestamps actualizados a 2026-05-15 (estado actual del inventario)
--   - Nuevos registros inventory_id 81-90 para productos hogar premium
-- =============================================================

BEGIN;

-- ------------------------------------------------------------
-- 10. INVENTORY
-- ------------------------------------------------------------
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (1, 1, 4, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (2, 2, 2, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (3, 3, 8, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (4, 4, 118, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (5, 5, 59, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (6, 6, 80, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (7, 7, 17, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (8, 8, 199, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (9, 9, 33, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (10, 10, 0, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (11, 11, 59, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (12, 12, 148, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (13, 13, 11, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (14, 14, 162, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (15, 15, 148, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (16, 16, 85, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (17, 17, 174, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (18, 18, 227, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (19, 19, 78, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (20, 20, 22, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (21, 21, 122, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (22, 22, 235, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (23, 23, 71, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (24, 24, 240, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (25, 25, 27, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (26, 26, 17, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (27, 27, 21, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (28, 28, 174, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (29, 29, 285, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (30, 30, 222, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (31, 31, 144, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (32, 32, 232, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (33, 33, 238, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (34, 34, 285, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (35, 35, 238, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (36, 36, 104, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (37, 37, 143, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (38, 38, 195, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (39, 39, 199, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (40, 40, 176, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (41, 41, 153, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (42, 42, 99, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (43, 43, 211, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (44, 44, 171, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (45, 45, 134, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (46, 46, 22, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (47, 47, 141, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (48, 48, 165, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (49, 49, 285, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (50, 50, 255, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (51, 51, 46, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (52, 52, 149, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (53, 53, 168, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (54, 54, 12, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (55, 55, 30, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (56, 56, 21, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (57, 57, 221, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (58, 58, 193, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (59, 59, 246, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (60, 60, 118, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (61, 61, 284, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (62, 62, 97, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (63, 63, 19, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (64, 64, 292, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (65, 65, 82, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (66, 66, 227, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (67, 67, 237, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (68, 68, 52, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (69, 69, 30, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (70, 70, 179, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (71, 71, 269, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (72, 72, 64, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (73, 73, 7, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (74, 74, 200, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (75, 75, 70, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (76, 76, 178, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (77, 77, 167, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (78, 78, 183, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (79, 79, 46, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (80, 80, 46, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (81, 81, 41, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (82, 82, 15, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (83, 83, 39, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (84, 84, 14, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (85, 85, 43, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (86, 86, 39, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (87, 87, 38, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (88, 88, 11, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (89, 89, 15, '2026-05-15 00:00:00');
INSERT INTO inventory (inventory_id, product_id, stock, updated_at) VALUES (90, 90, 21, '2026-05-15 00:00:00');

COMMIT;

-- End of shopsphere-seed-operacional.sql
