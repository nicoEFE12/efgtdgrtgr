-- Agregar columna de numero_contrato_auto a la tabla projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS numero_contrato_auto INTEGER;

-- Actualizar los 4 proyectos existentes con números del 1 al 4
WITH numbered_projects AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) as row_num
  FROM projects
  LIMIT 4
)
UPDATE projects
SET numero_contrato_auto = np.row_num
FROM numbered_projects np
WHERE projects.id = np.id;

-- Crear secuencia para auto-incremento (empezando desde 5)
CREATE SEQUENCE IF NOT EXISTS contrato_number_seq START WITH 5;

-- Comentario para referencia
COMMENT ON COLUMN projects.numero_contrato_auto IS 'Número de contrato auto-generado, incrementa automáticamente';
