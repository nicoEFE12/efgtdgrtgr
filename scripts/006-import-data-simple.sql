-- =====================================================
-- IMPORTACIÓN DE DATOS DESDE PLANILLAS EXCEL
-- Am Soluciones Constructivas
-- Ejecutar en Neon SQL Editor (versión simplificada)
-- =====================================================

-- =====================================================
-- 1. BASE DE MATERIALES
-- =====================================================

-- Primero limpiar materiales existentes (opcional - comentar si no quieres borrar)
-- DELETE FROM materials;

INSERT INTO materials (nombre, precio_unitario, unidad, proveedor, codigo_referencia, categoria) VALUES
-- Materiales básicos de construcción
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

-- Materiales para revestimiento
('Ladrillos', 220, 'unidad', NULL, 'LADRILLO', 'Materiales básicos'),
('Plasticor 25kg', 14000, 'bolsa', NULL, 'PLASTICOR', 'Materiales básicos'),
('Hierro 8"', 11400, 'unidad', NULL, 'HIERRO8', 'Hierros'),
('Nafta/Combustible', 25714, 'tanque', NULL, 'NAFTA', 'Combustibles');

-- =====================================================
-- 2. CONFIGURACIÓN DE COSTOS FIJOS Y PARÁMETROS
-- =====================================================

-- Actualizar configuraciones existentes
UPDATE global_settings SET value = '1212634', description = 'Costos fijos mensuales totales' WHERE key = 'costo_fijo_mensual';
UPDATE global_settings SET value = '15', description = 'Días laborables por mes' WHERE key = 'dias_laborables_mes';
UPDATE global_settings SET value = '5', description = 'Porcentaje de ahorro del negocio' WHERE key = 'margen_ganancia';

-- Insertar nuevas configuraciones
INSERT INTO global_settings (key, value, description) VALUES
('valor_dia_empleados', '90000', 'Valor día de trabajo empleados'),
('valor_dia_am', '145000', 'Valor día AM (dueño)'),
('precio_combustible_tanque', '50000', 'Precio combustible por tanque'),
('tanques_por_50m2', '2.5', 'Tanques de combustible por cada 50 m²'),
('porcentaje_ahorro_negocio', '5', 'Porcentaje de ahorro del negocio'),
('costo_fijo_por_dia', '80842.27', 'Costo fijo calculado por día'),
('sueldo_minimo_mensual_am', '4000000', 'Sueldo mínimo mensual AM'),
('dias_productivos_ganancia', '20', 'Días productivos para ganancia'),
('ganancia_minima_am_dia', '200000', 'Ganancia mínima AM por día')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- =====================================================
-- 3. TIPO DE SERVICIO: REVESTIMIENTO
-- =====================================================

INSERT INTO service_types (nombre, descripcion, rendimiento_m2_dia, costo_mano_obra_dia, incluye_cargas_sociales, porcentaje_cargas) VALUES
('Revestimiento para vivienda prefabricada', 
 'Revestimiento completo: ladrillos, cemento, plasticor, arena, hierro. Precio final x m2 CMI: $89,543 | MDO: $54,263',
 7,
 90000,
 false,
 0
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 'Materiales importados:' as info, COUNT(*) as total FROM materials;
SELECT 'Configuraciones:' as info, COUNT(*) as total FROM global_settings;
SELECT 'Tipos de servicio:' as info, COUNT(*) as total FROM service_types;
