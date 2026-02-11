-- Add default configuration values for new fields
INSERT INTO global_settings (key, value, updated_at)
VALUES 
  ('costo_fijo_mensual', '0', NOW()),
  ('dias_laborables_mes', '22', NOW()),
  ('porcentaje_cargas_sociales', '0', NOW())
ON CONFLICT (key) DO NOTHING;
