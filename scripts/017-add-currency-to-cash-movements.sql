-- Add currency column to cash_movements (ARS or USD)
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ARS';
-- Add exchange_rate column to track the rate used at transaction time
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 1.0;
-- Add currency column to project_cash_movements
ALTER TABLE project_cash_movements ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ARS';
-- Add exchange_rate column to project_cash_movements
ALTER TABLE project_cash_movements ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 1.0;
-- Populate currency=USD for efectivo_usd payment method in cash_movements
UPDATE cash_movements SET currency = 'USD' WHERE payment_method = 'efectivo_usd' AND currency = 'ARS';
-- Populate currency=USD for efectivo_usd payment method in project_cash_movements
UPDATE project_cash_movements SET currency = 'USD' WHERE payment_method = 'efectivo_usd' AND currency = 'ARS';
-- Create index for faster currency filtering in cash_movements
CREATE INDEX IF NOT EXISTS idx_cash_movements_currency ON cash_movements(currency);
-- Create index for faster currency filtering in project_cash_movements
CREATE INDEX IF NOT EXISTS idx_project_cash_movements_currency ON project_cash_movements(currency);
