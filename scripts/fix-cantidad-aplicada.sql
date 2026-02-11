-- Fix missing cantidad_aplicada column in project_rubros
ALTER TABLE project_rubros ADD COLUMN IF NOT EXISTS cantidad_aplicada DECIMAL(10,2) NOT NULL DEFAULT 0;