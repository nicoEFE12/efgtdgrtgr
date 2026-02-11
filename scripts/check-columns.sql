-- Check columns in project_rubros table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'project_rubros' 
ORDER BY ordinal_position;