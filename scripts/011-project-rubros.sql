CREATE TABLE IF NOT EXISTS project_rubros (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quotation_item_id INTEGER REFERENCES quotation_items(id) ON DELETE SET NULL,
  descripcion VARCHAR(500) NOT NULL,
  service_type_id INTEGER REFERENCES service_types(id),
  m2 DECIMAL(10,2),
  unidad VARCHAR(50) DEFAULT 'm2',
  dias_estimados DECIMAL(10,2),
  costo_materiales DECIMAL(15,2) NOT NULL DEFAULT 0,
  costo_mano_obra DECIMAL(15,2) NOT NULL DEFAULT 0,
  costo_fijos_prorrateados DECIMAL(15,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_rubro_materials (
  id SERIAL PRIMARY KEY,
  project_rubro_id INTEGER NOT NULL REFERENCES project_rubros(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(50) NOT NULL,
  precio_unitario DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL;
