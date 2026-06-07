/*
  # Sistema de Boletas y Órdenes de Servicio - Benjamin Gonzalez Tecnología

  1. Nuevas Tablas
    - `receipts` (boletas)
      - `id` (uuid, primary key)
      - `receipt_number` (text, unique, auto-generated)
      - `client_name` (text)
      - `client_email` (text)
      - `client_phone` (text)
      - `client_address` (text)
      - `items` (jsonb, array of items with description, quantity, price)
      - `subtotal` (decimal)
      - `tax` (decimal)
      - `total` (decimal)
      - `created_at` (timestamp)
      
    - `service_orders` (órdenes de servicio)
      - `id` (uuid, primary key)
      - `order_number` (text, unique, auto-generated)
      - `client_name` (text)
      - `client_email` (text)
      - `client_phone` (text)
      - `client_address` (text)
      - `device_type` (text[], array: pc, tablet, phone)
      - `device_brand` (text)
      - `device_model` (text)
      - `device_serial` (text)
      - `problem_description` (text)
      - `service_type` (text: repair, sale, installation, other)
      - `status` (text: pending, in_progress, completed, delivered)
      - `estimated_cost` (decimal)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Seguridad
    - Enable RLS on both tables
    - Allow public access for insert and select (no login required)
    
  3. Funciones
    - Auto-generate receipt and order numbers
*/

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_address text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create service orders table
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_address text,
  device_type text[] DEFAULT ARRAY[]::text[],
  device_brand text,
  device_model text,
  device_serial text,
  problem_description text,
  service_type text NOT NULL,
  status text DEFAULT 'pending',
  estimated_cost decimal(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON service_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_order_number ON service_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no login required)
CREATE POLICY "Allow public to insert receipts"
  ON receipts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public to view receipts"
  ON receipts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public to insert service orders"
  ON service_orders FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public to view service orders"
  ON service_orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public to update service orders"
  ON service_orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  counter int;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM receipts;
  new_number := 'BOL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::text, 4, '0');
  RETURN new_number;
END;
$$;

-- Function to generate service order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  counter int;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM service_orders;
  new_number := 'OS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::text, 4, '0');
  RETURN new_number;
END;
$$;

-- Trigger to auto-generate receipt number
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_receipt_number
  BEFORE INSERT ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_receipt_number();

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_service_orders_updated_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();