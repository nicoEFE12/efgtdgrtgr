-- Check payment_method constraint in project_cash_movements
SELECT 
  conname, 
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'project_cash_movements'::regclass 
  AND conname LIKE '%payment_method%';