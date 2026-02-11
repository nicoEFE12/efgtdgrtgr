-- Am Soluciones Constructivas - Database Schema
-- Phase 1: Users, Clients, Cash, Projects

-- Users table (for auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  apellido_nombre VARCHAR(255) NOT NULL,
  numero_contrato VARCHAR(100) NOT NULL,
  dni VARCHAR(50) NOT NULL,
  domicilio_legal VARCHAR(500) NOT NULL,
  domicilio_obra VARCHAR(500) NOT NULL,
  telefono VARCHAR(100),
  email VARCHAR(255),
  presupuesto_consolidado_url TEXT,
  presupuesto_observacion TEXT,
  fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
  denominacion VARCHAR(255),
  plan_pago TEXT,
  observaciones TEXT,
  tiempo_obra_estimado VARCHAR(100),
  agenda_inicio DATE,
  agenda_cierre DATE,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash movements (Caja General)
CREATE TABLE IF NOT EXISTS cash_movements (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('banco', 'mercado_pago', 'efectivo_pesos', 'efectivo_usd', 'cheque')),
  concept VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  project_id INTEGER,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  numero_contrato VARCHAR(100) NOT NULL,
  presupuesto_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  importe_reservado DECIMAL(15,2) NOT NULL DEFAULT 0,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('activo', 'pendiente', 'cerrado')),
  fecha_inicio DATE,
  fecha_cierre DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for cash_movements.project_id
ALTER TABLE cash_movements 
ADD CONSTRAINT fk_cash_movements_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Project cash movements (Caja por Obra)
CREATE TABLE IF NOT EXISTS project_cash_movements (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('transferencia_in', 'egreso')),
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('banco', 'mercado_pago', 'efectivo_pesos', 'efectivo_usd', 'cheque', 'transferencia')),
  concept VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_cash_movement_id INTEGER REFERENCES cash_movements(id),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project documents
CREATE TABLE IF NOT EXISTS project_documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('contrato', 'presupuesto', 'plano', 'complementario', 'ficha_cliente')),
  filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials base
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  precio_unitario DECIMAL(15,2) NOT NULL,
  unidad VARCHAR(50) NOT NULL,
  proveedor VARCHAR(255),
  codigo_referencia VARCHAR(100),
  categoria VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global settings (costos fijos, parametros)
CREATE TABLE IF NOT EXISTS global_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description VARCHAR(500),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service types for cotizador
CREATE TABLE IF NOT EXISTS service_types (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  rendimiento_m2_dia DECIMAL(10,2),
  costo_mano_obra_dia DECIMAL(15,2),
  incluye_cargas_sociales BOOLEAN DEFAULT FALSE,
  porcentaje_cargas DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service type materials (many-to-many)
CREATE TABLE IF NOT EXISTS service_type_materials (
  id SERIAL PRIMARY KEY,
  service_type_id INTEGER NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  cantidad_por_m2 DECIMAL(10,4) NOT NULL,
  UNIQUE(service_type_id, material_id)
);

-- Quotations (Presupuestos/Cotizaciones)
CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  estado VARCHAR(50) NOT NULL DEFAULT 'borrador',
  notas TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotation items
CREATE TABLE IF NOT EXISTS quotation_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  service_type_id INTEGER REFERENCES service_types(id),
  descripcion VARCHAR(500) NOT NULL,
  m2 DECIMAL(10,2),
  dias_estimados DECIMAL(10,2),
  costo_materiales DECIMAL(15,2) NOT NULL DEFAULT 0,
  costo_mano_obra DECIMAL(15,2) NOT NULL DEFAULT 0,
  costo_fijos_prorrateados DECIMAL(15,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table for auth
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (password: admin123 - hashed with bcrypt)
-- We'll create the user via the app's registration flow instead

-- Insert default global settings
INSERT INTO global_settings (key, value, description) VALUES
  ('costo_fijo_mensual', '0', 'Costo fijo mensual de la empresa'),
  ('dias_laborables_mes', '22', 'Dias laborables por mes'),
  ('margen_ganancia', '30', 'Margen de ganancia en porcentaje'),
  ('porcentaje_cargas_sociales', '0', 'Porcentaje de cargas sociales')
ON CONFLICT (key) DO NOTHING;
