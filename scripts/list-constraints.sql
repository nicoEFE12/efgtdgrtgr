SELECT 
  conname, 
  contype, 
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'project_cash_movements'::regclass;