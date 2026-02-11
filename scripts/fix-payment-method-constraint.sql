-- Update payment_method constraint to allow caja_obra
ALTER TABLE project_cash_movements DROP CONSTRAINT project_cash_movements_payment_method_check;
ALTER TABLE project_cash_movements ADD CONSTRAINT project_cash_movements_payment_method_check
  CHECK (payment_method IN ('banco', 'mercado_pago', 'efectivo_pesos', 'efectivo_usd', 'cheque', 'transferencia', 'caja_obra'));