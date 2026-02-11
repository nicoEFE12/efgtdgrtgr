-- =====================================================
-- IMPORTACIÓN DE DATOS DESDE PLANILLAS EXCEL
-- Am Soluciones Constructivas
-- Ejecutar en Neon SQL Editor
-- =====================================================

-- =====================================================
-- 1. BASE DE MATERIALES
-- =====================================================

INSERT INTO materials (nombre, precio_unitario, unidad, proveedor, codigo_referencia, categoria) VALUES
-- Materiales básicos
('Aislante espuma aluminazada (1x20)', 0, 'unidad', NULL, 'ALUMINAZADA', 'Aislantes'),
('Arena fina', 73000, 'm3', NULL, 'ARENA', 'Áridos'),
('Caño de desagüe 110mm', 35000, 'unidad', NULL, 'CAÑO110', 'Plomería'),
('Caño de desagüe 60mm', 35000, 'unidad', NULL, 'CAÑO60', 'Plomería'),
('Cemento 25kg', 7000, 'bolsa', NULL, 'CEM25', 'Materiales básicos'),
('Chapas c-25 (110x5)', 0, 'unidad', NULL, 'CHAPA25', 'Chapas'),
('Clavos espiralados 1"x1kg', 0, 'unidad', NULL, 'CLAVO1', 'Ferretería'),

-- Columnas prearmadas 10"
('Columna prearmada 10" 15x15', 0, 'metro lineal', NULL, 'COLUPRE10-15X15', 'Estructuras'),
('Columna prearmada 10" 15x20', 0, 'metro lineal', NULL, 'COLUPRE10-15X20', 'Estructuras'),
('Columna prearmada 10" 20x30', 0, 'metro lineal', NULL, 'COLUPRE10-20X30', 'Estructuras'),
('Columna prearmada 10" 30x30', 0, 'metro lineal', NULL, 'COLUPRE10-30X30', 'Estructuras'),

-- Columnas prearmadas 12"
('Columna prearmada 12" 15x15', 0, 'metro lineal', NULL, 'COLUPRE12-15X15', 'Estructuras'),
('Columna prearmada 12" 15x20', 0, 'metro lineal', NULL, 'COLUPRE12-15X20', 'Estructuras'),
('Columna prearmada 12" 20x30', 0, 'metro lineal', NULL, 'COLUPRE12-20X30', 'Estructuras'),
('Columna prearmada 12" 30x30', 0, 'metro lineal', NULL, 'COLUPRE12-30X30', 'Estructuras'),

-- Columnas prearmadas 8"
('Columna prearmada 8" 15x15', 0, 'metro lineal', NULL, 'COLUPRE8-15X15', 'Estructuras'),
('Columna prearmada 8" 15x20', 0, 'metro lineal', NULL, 'COLUPRE8-15X20', 'Estructuras'),
('Columna prearmada 8" 20x30', 0, 'metro lineal', NULL, 'COLUPRE8-20X30', 'Estructuras'),
('Columna prearmada 8" 30x30', 0, 'metro lineal', NULL, 'COLUPRE8-30X30', 'Estructuras'),

-- Materiales del cotizador (Revestimiento)
('Ladrillos', 220, 'unidad', NULL, 'LADRILLO', 'Materiales básicos'),
('Plasticor 25kg', 14000, 'bolsa', NULL, 'PLASTICOR', 'Materiales básicos'),
('Hierro 8"', 11400, 'unidad', NULL, 'HIERRO8', 'Hierros'),
('Nafta/Combustible', 25714, 'tanque', NULL, 'NAFTA', 'Combustibles')

ON CONFLICT (codigo_referencia) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  precio_unitario = EXCLUDED.precio_unitario,
  unidad = EXCLUDED.unidad,
  categoria = EXCLUDED.categoria,
  updated_at = NOW();

-- =====================================================
-- 2. CONFIGURACIÓN DE COSTOS FIJOS Y PARÁMETROS
-- =====================================================

-- Actualizar o insertar configuraciones globales
INSERT INTO global_settings (key, value, description) VALUES
('costo_fijo_mensual', '1212634', 'Costos fijos mensuales totales'),
('dias_laborables_mes', '15', 'Días laborables por mes'),
('valor_dia_empleados', '90000', 'Valor día de trabajo empleados'),
('valor_dia_am', '145000', 'Valor día AM (dueño)'),
('precio_combustible_tanque', '50000', 'Precio combustible por tanque'),
('tanques_por_50m2', '2.5', 'Tanques de combustible por cada 50 m²'),
('porcentaje_ahorro_negocio', '5', 'Porcentaje de ahorro del negocio'),
('costo_fijo_por_dia', '80842.27', 'Costo fijo calculado por día'),
('sueldo_minimo_mensual_am', '4000000', 'Sueldo mínimo mensual AM'),
('dias_productivos_ganancia', '20', 'Días productivos para ganancia'),
('ganancia_minima_am_dia', '200000', 'Ganancia mínima AM por día'),
('margen_ganancia', '5', 'Margen de ganancia en porcentaje')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 3. TIPO DE SERVICIO: REVESTIMIENTO PARA VIVIENDA PREFABRICADA
-- =====================================================

INSERT INTO service_types (nombre, descripcion, rendimiento_m2_dia, costo_mano_obra_dia, incluye_cargas_sociales, porcentaje_cargas) VALUES
('Revestimiento para vivienda prefabricada', 
 'Servicio completo de revestimiento incluyendo ladrillos, cemento, plasticor, arena fina, hierro. Rendimiento aprox 7 m²/día.',
 7, -- rendimiento m2 por día (100m2 / 14.29 días ≈ 7 m²/día)
 90000, -- costo mano de obra día (empleados)
 false,
 0
)
ON CONFLICT DO NOTHING;

-- Obtener el ID del servicio recién creado
DO $$
DECLARE
  service_id INTEGER;
  mat_ladrillo INTEGER;
  mat_cemento INTEGER;
  mat_plasticor INTEGER;
  mat_arena INTEGER;
  mat_hierro INTEGER;
BEGIN
  -- Obtener ID del servicio
  SELECT id INTO service_id FROM service_types WHERE nombre = 'Revestimiento para vivienda prefabricada' LIMIT 1;
  
  -- Obtener IDs de materiales
  SELECT id INTO mat_ladrillo FROM materials WHERE codigo_referencia = 'LADRILLO' LIMIT 1;
  SELECT id INTO mat_cemento FROM materials WHERE codigo_referencia = 'CEM25' LIMIT 1;
  SELECT id INTO mat_plasticor FROM materials WHERE codigo_referencia = 'PLASTICOR' LIMIT 1;
  SELECT id INTO mat_arena FROM materials WHERE codigo_referencia = 'ARENA' LIMIT 1;
  SELECT id INTO mat_hierro FROM materials WHERE codigo_referencia = 'HIERRO8' LIMIT 1;
  
  -- Insertar relaciones service_type_materials (cantidad por m2)
  IF service_id IS NOT NULL THEN
    -- Ladrillos: 50 unidades por m2
    IF mat_ladrillo IS NOT NULL THEN
      INSERT INTO service_type_materials (service_type_id, material_id, cantidad_por_m2)
      VALUES (service_id, mat_ladrillo, 50)
      ON CONFLICT (service_type_id, material_id) DO UPDATE SET cantidad_por_m2 = 50;
    END IF;
    
    -- Cemento: 0.5 bolsas por m2
    IF mat_cemento IS NOT NULL THEN
      INSERT INTO service_type_materials (service_type_id, material_id, cantidad_por_m2)
      VALUES (service_id, mat_cemento, 0.5)
      ON CONFLICT (service_type_id, material_id) DO UPDATE SET cantidad_por_m2 = 0.5;
    END IF;
    
    -- Plasticor: 0.8 bolsas por m2
    IF mat_plasticor IS NOT NULL THEN
      INSERT INTO service_type_materials (service_type_id, material_id, cantidad_por_m2)
      VALUES (service_id, mat_plasticor, 0.8)
      ON CONFLICT (service_type_id, material_id) DO UPDATE SET cantidad_por_m2 = 0.8;
    END IF;
    
    -- Arena fina: 0.1 m3 por m2
    IF mat_arena IS NOT NULL THEN
      INSERT INTO service_type_materials (service_type_id, material_id, cantidad_por_m2)
      VALUES (service_id, mat_arena, 0.1)
      ON CONFLICT (service_type_id, material_id) DO UPDATE SET cantidad_por_m2 = 0.1;
    END IF;
    
    -- Hierro 8": 0.2 unidades por m2
    IF mat_hierro IS NOT NULL THEN
      INSERT INTO service_type_materials (service_type_id, material_id, cantidad_por_m2)
      VALUES (service_id, mat_hierro, 0.2)
      ON CONFLICT (service_type_id, material_id) DO UPDATE SET cantidad_por_m2 = 0.2;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 4. VERIFICACIÓN DE DATOS IMPORTADOS
-- =====================================================

-- Verificar materiales importados
SELECT COUNT(*) as total_materiales FROM materials;

-- Verificar configuraciones
SELECT key, value, description FROM global_settings ORDER BY key;

-- Verificar tipos de servicio
SELECT * FROM service_types;

-- Verificar materiales por servicio
SELECT 
  st.nombre as servicio,
  m.nombre as material,
  m.precio_unitario,
  m.unidad,
  stm.cantidad_por_m2
FROM service_type_materials stm
JOIN service_types st ON stm.service_type_id = st.id
JOIN materials m ON stm.material_id = m.id
ORDER BY st.nombre, m.nombre;
