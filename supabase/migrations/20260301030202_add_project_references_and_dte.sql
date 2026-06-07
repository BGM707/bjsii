/*
  # Add project references to document tables and create DTE infrastructure

  1. Updates
    - Add project_id foreign key to receipts and service_orders tables
    - Add document_type, sii_status, sii_folio fields for tracking

  2. New Table: dte_documents
    - Complete DTE (Documento Tributario Electrónico) management
    - Tracks SII registration and electronic seals
    - Stores XML and seal data for SII integration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE receipts ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE receipts ADD COLUMN document_type text DEFAULT 'Manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'sii_status'
  ) THEN
    ALTER TABLE receipts ADD COLUMN sii_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'sii_folio'
  ) THEN
    ALTER TABLE receipts ADD COLUMN sii_folio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'electronic_seal'
  ) THEN
    ALTER TABLE receipts ADD COLUMN electronic_seal jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'receipts' AND column_name = 'company_rut'
  ) THEN
    ALTER TABLE receipts ADD COLUMN company_rut text DEFAULT '78.332.298-6';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_orders' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE service_orders ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS dte_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE NOT NULL,
  company_rut text NOT NULL,
  company_name text NOT NULL,
  document_type text NOT NULL,
  recipient_rut text NOT NULL,
  recipient_name text NOT NULL,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  net_amount numeric NOT NULL,
  iva_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  document_description text,
  xml_content text,
  electronic_seal text,
  sii_status text DEFAULT 'pending',
  sii_response jsonb,
  receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dte_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view DTE documents"
  ON dte_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert DTE documents"
  ON dte_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update DTE documents"
  ON dte_documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS sii_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_rut text UNIQUE NOT NULL,
  company_name text NOT NULL,
  sii_username text,
  sii_password_hash text,
  certificate_path text,
  certificate_password_hash text,
  sii_environment text DEFAULT 'production',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sii_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view SII config"
  ON sii_configurations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update SII config"
  ON sii_configurations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);