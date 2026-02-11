-- Esta es la solución para resetear la secuencia desincronizada en allowed_emails
-- El error "duplicate key value violates unique constraint" ocurre cuando se elimina
-- un registro y la secuencia de PostgreSQL no se reinicia correctamente.

-- Primero, verifica el estado actual de la tabla
SELECT id, email, role, created_at FROM allowed_emails ORDER BY id;

-- Obtén el máximo ID actual
SELECT MAX(id) as max_id FROM allowed_emails;

-- Resetea la secuencia para que el próximo inserción tenga el ID correcto
SELECT setval('allowed_emails_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM allowed_emails));

-- Verifica que la secuencia se reinició correctamente
SELECT currval('allowed_emails_id_seq');

-- Ahora los nuevos insertos funcionarán correctamente sin errores de clave duplicada
