-- Migration: Fix project_cash_movements type constraint + add project_config

-- 1. Fix type constraint to allow 'ingreso' type
ALTER TABLE project_cash_movements DROP CONSTRAINT IF EXISTS project_cash_movements_type_check;
ALTER TABLE project_cash_movements ADD CONSTRAINT project_cash_movements_type_check
  CHECK (type IN ('transferencia_in', 'egreso', 'ingreso'));

-- 2. Create project_config table for configurable expense categories, etc.
CREATE TABLE IF NOT EXISTS project_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '[]',
  description VARCHAR(500),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Seed default expense categories for "Gasto Comun"
INSERT INTO project_config (key, value, description) VALUES
  ('gastos_comunes', '["Transporte de personal","Comida/Viandas","Combustible","Peaje","Alquiler de herramientas","Limpieza","Seguridad e higiene","Varios"]', 'Categorías de gastos comunes de obra'),
  ('medios_pago', '["banco","mercado_pago","efectivo_pesos","efectivo_usd","cheque"]', 'Medios de pago habilitados'),
  ('categorias_egreso', '["Materiales","Mano de obra","Flete","Herramientas","Combustible","Varios"]', 'Categorías de egresos de obra'),
  ('cuota_conceptos', '["Cuota mensual","Anticipo","Refuerzo","Certificado de obra","Ajuste","Otro"]', 'Conceptos de cobro de cuotas')
ON CONFLICT (key) DO NOTHING;
