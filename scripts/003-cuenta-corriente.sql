-- Cuenta Corriente per Client
CREATE TABLE IF NOT EXISTS cuenta_corriente (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('cobro', 'cargo')),
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('banco', 'mercado_pago', 'efectivo_pesos', 'efectivo_usd', 'cheque', NULL)),
  concept VARCHAR(500) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
