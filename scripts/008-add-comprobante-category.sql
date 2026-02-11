-- Add 'comprobante' as allowed category for project documents
ALTER TABLE project_documents DROP CONSTRAINT IF EXISTS project_documents_category_check;
ALTER TABLE project_documents ADD CONSTRAINT project_documents_category_check 
  CHECK (category IN ('contrato', 'presupuesto', 'plano', 'complementario', 'ficha_cliente', 'comprobante'));
