-- Crear usuario de prueba para AM Soluciones Constructivas
-- Ejecuta este comando directamente en Neon SQL Editor

INSERT INTO users (name, email, password_hash, role)
VALUES ('Usuario Test', 'test@example.com', '4cb356f060f7fe5d4b2ef834e286a96b:6f7ce3dc0dc63796cf382804f65ac5ac14066bb28d22ffe91da3c4c0455b4bb6b78c4cdb853b63ab8f6a33042c841589da69f0e35d8ae0be6c80aec4b7cd2616', 'admin');

-- CREDENCIALES DE ACCESO:
-- Email: test@example.com
-- Contraseña: test123

-- Para verificar que se creó correctamente:
-- SELECT id, name, email, role FROM users WHERE email = 'test@example.com';

-- Para eliminar el usuario de prueba cuando ya no lo necesites:
-- DELETE FROM users WHERE email = 'test@example.com';
