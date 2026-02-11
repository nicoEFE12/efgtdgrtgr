-- Add costo_total to quotations
ALTER TABLE quotations
ADD COLUMN costo_total NUMERIC(12, 2);
