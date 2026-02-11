ALTER TABLE quotations
ADD COLUMN status VARCHAR(20) DEFAULT 'borrador' NOT NULL,
ADD CONSTRAINT quotations_status_check CHECK (status IN ('borrador', 'enviada', 'cobrado', 'rechazada'));
