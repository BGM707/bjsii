
-- Add missing columns to existing tables

-- cobros_notes: add iva, total, sii_folio, sii_estado, sii_error, user_id
ALTER TABLE cobros_notes ADD COLUMN IF NOT EXISTS iva numeric DEFAULT 0;
ALTER TABLE cobros_notes ADD COLUMN IF NOT EXISTS total numeric DEFAULT 0;
ALTER TABLE cobros_notes ADD COLUMN IF NOT EXISTS sii_folio text;
ALTER TABLE cobros_notes ADD COLUMN IF NOT EXISTS sii_estado text;
ALTER TABLE cobros_notes ADD COLUMN IF NOT EXISTS sii_error text;
ALTER TABLE cobros_notes ADD COLUMN IF NOT EXISTS user_id uuid;

-- receipts: add cobro_id, user_id, tax_rate, total_discount
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS cobro_id uuid;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 19;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS total_discount numeric DEFAULT 0;

-- service_orders: add cobro_id, user_id
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS cobro_id uuid;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS user_id uuid;

-- projects: add user_id
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id uuid;

-- dte_documents: add user_id
ALTER TABLE dte_documents ADD COLUMN IF NOT EXISTS user_id uuid;

-- sii_configurations: add user_id
ALTER TABLE sii_configurations ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create payment_notices table if not exists
CREATE TABLE IF NOT EXISTS payment_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL,
  cliente text NOT NULL,
  rut text,
  telefono text,
  servicio_titulo text,
  servicio_desc text,
  periodo text,
  neto numeric DEFAULT 0,
  iva numeric DEFAULT 0,
  total numeric DEFAULT 0,
  banco text,
  cuenta text,
  titular text,
  estado text DEFAULT 'pendiente',
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  cobro_id uuid,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_notices ENABLE ROW LEVEL SECURITY;
