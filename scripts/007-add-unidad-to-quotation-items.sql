-- Agregar columna unidad a quotation_items
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unidad VARCHAR(50) DEFAULT 'm2';
