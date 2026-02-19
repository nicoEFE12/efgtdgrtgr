-- Allow 'ingreso' type in project_cash_movements for direct income tracking
-- Drop any existing type check constraint
ALTER TABLE project_cash_movements DROP CONSTRAINT IF EXISTS project_cash_movements_type_check;
ALTER TABLE project_cash_movements DROP CONSTRAINT IF EXISTS project_cash_movements_check;
-- Recreate with 'ingreso' allowed
ALTER TABLE project_cash_movements ADD CONSTRAINT project_cash_movements_type_chk
  CHECK (type IN ('transferencia_in', 'egreso', 'ingreso'))
