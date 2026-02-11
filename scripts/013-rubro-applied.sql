-- Migration: Add "applied" tracking to rubros and materials

-- 1. Add applied flag and quantity tracking to materials
ALTER TABLE project_rubro_materials ADD COLUMN IF NOT EXISTS applied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE project_rubro_materials ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE project_rubro_materials ADD COLUMN IF NOT EXISTS cantidad_aplicada DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 2. Add mano de obra applied flag to rubros
ALTER TABLE project_rubros ADD COLUMN IF NOT EXISTS mano_obra_applied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE project_rubros ADD COLUMN IF NOT EXISTS mano_obra_applied_at TIMESTAMP WITH TIME ZONE;

-- 3. Add direct progress tracking for rubros (for rubros without individual materials)
ALTER TABLE project_rubros ADD COLUMN IF NOT EXISTS cantidad_aplicada DECIMAL(10,2) NOT NULL DEFAULT 0;
