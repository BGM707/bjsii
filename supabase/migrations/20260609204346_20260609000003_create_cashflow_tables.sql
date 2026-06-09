/*
  # Create Cash Flow tables: purchases, sales, and cash_register

  1. New Tables
    - `cash_categories` - Categorias para clasificar transacciones
    - `cash_transactions` - Registro de todas las transacciones de caja
    - `purchases` - Registro de compras
    - `sales` - Registro de ventas

  2. Security
    - Enable RLS on all tables
    - user_id-based policies (same security model as existing tables)
*/

CREATE TABLE IF NOT EXISTS cash_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'purchase', 'sale')),
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cash_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cash_categories" ON cash_categories;
CREATE POLICY "select_cash_categories" ON cash_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_cash_categories" ON cash_categories;
CREATE POLICY "insert_cash_categories" ON cash_categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_cash_categories" ON cash_categories;
CREATE POLICY "update_cash_categories" ON cash_categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_cash_categories" ON cash_categories;
CREATE POLICY "delete_cash_categories" ON cash_categories FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('entry', 'exit')),
  category_id uuid REFERENCES cash_categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  description text,
  reference_type text CHECK (reference_type IN ('purchase', 'sale', 'receipt', 'service_order', 'manual')),
  reference_id uuid,
  payment_method text CHECK (payment_method IN ('cash', 'transfer', 'card', 'check', 'other')),
  document_number text,
  contact_name text,
  contact_rut text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid NOT NULL DEFAULT '3ad18039-cf5a-45e5-badc-2cf93b4af171',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cash_transactions" ON cash_transactions;
CREATE POLICY "select_cash_transactions" ON cash_transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_cash_transactions" ON cash_transactions;
CREATE POLICY "insert_cash_transactions" ON cash_transactions FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

DROP POLICY IF EXISTS "update_cash_transactions" ON cash_transactions;
CREATE POLICY "update_cash_transactions" ON cash_transactions FOR UPDATE
  TO anon, authenticated USING (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171') WITH CHECK (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

DROP POLICY IF EXISTS "delete_cash_transactions" ON cash_transactions;
CREATE POLICY "delete_cash_transactions" ON cash_transactions FOR DELETE
  TO anon, authenticated USING (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text,
  supplier_name text NOT NULL,
  supplier_rut text,
  description text,
  items jsonb DEFAULT '[]',
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric NOT NULL,
  payment_method text CHECK (payment_method IN ('cash', 'transfer', 'card', 'check', 'other')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'partial')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid NOT NULL DEFAULT '3ad18039-cf5a-45e5-badc-2cf93b4af171',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_purchases" ON purchases;
CREATE POLICY "select_purchases" ON purchases FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_purchases" ON purchases;
CREATE POLICY "insert_purchases" ON purchases FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

DROP POLICY IF EXISTS "update_purchases" ON purchases;
CREATE POLICY "update_purchases" ON purchases FOR UPDATE
  TO anon, authenticated USING (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171') WITH CHECK (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

DROP POLICY IF EXISTS "delete_purchases" ON purchases;
CREATE POLICY "delete_purchases" ON purchases FOR DELETE
  TO anon, authenticated USING (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text,
  client_name text NOT NULL,
  client_rut text,
  description text,
  items jsonb DEFAULT '[]',
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric NOT NULL,
  payment_method text CHECK (payment_method IN ('cash', 'transfer', 'card', 'check', 'other')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'partial')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid NOT NULL DEFAULT '3ad18039-cf5a-45e5-badc-2cf93b4af171',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sales" ON sales;
CREATE POLICY "select_sales" ON sales FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_sales" ON sales;
CREATE POLICY "insert_sales" ON sales FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

DROP POLICY IF EXISTS "update_sales" ON sales;
CREATE POLICY "update_sales" ON sales FOR UPDATE
  TO anon, authenticated USING (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171') WITH CHECK (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

DROP POLICY IF EXISTS "delete_sales" ON sales;
CREATE POLICY "delete_sales" ON sales FOR DELETE
  TO anon, authenticated USING (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

INSERT INTO cash_categories (name, type, description) VALUES
  ('Ventas de Servicios', 'income', 'Ingresos por servicios prestados'),
  ('Ventas de Productos', 'income', 'Ingresos por venta de productos/hardware'),
  ('Compras de Insumos', 'expense', 'Compras de insumos y materiales'),
  ('Compras de Hardware', 'expense', 'Compras de equipos y hardware'),
  ('Servicios Externos', 'expense', 'Servicios contratados a terceros'),
  ('Arriendo', 'expense', 'Gastos de arriendo de local'),
  ('Servicios Basicos', 'expense', 'Luz, agua, internet, telefono'),
  ('Sueldos', 'expense', 'Pagos de remuneraciones'),
  ('Imprevistos', 'expense', 'Gastos imprevistos varios'),
  ('Caja Inicial', 'income', 'Apertura de caja o capital inicial')
ON CONFLICT DO NOTHING;
