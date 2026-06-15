-- publish-nivel-3.sql
--
-- Publica todos los ejercicios y el nivel 3 (JOINs) en la plataforma.
-- Idempotente: ejecutar dos veces no produce cambios adicionales.
--
-- Ejecución desde Docker:
--
--   docker exec shopsphere-db psql \
--     -U shopsphere_user -d shopsphere \
--     -f /scripts/publish-nivel-3.sql
--
-- O como comando inline:
--
--   docker exec shopsphere-db psql \
--     -U shopsphere_user -d shopsphere \
--     -c "UPDATE exercises SET is_published = true WHERE level_id = 3; \
--         UPDATE levels SET is_published = true WHERE id = 3;"
--
-- Nota: correr DESPUÉS de `npm run seed:exercises` para que los ejercicios
-- del nivel ya existan en la tabla exercises.

UPDATE exercises
SET is_published = true
WHERE level_id = 3;

UPDATE levels
SET is_published = true
WHERE id = 3;
