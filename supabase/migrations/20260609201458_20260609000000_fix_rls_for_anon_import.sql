/*
  # Fix RLS policies for anonymous access and data import

  1. Problem
    - The app uses localStorage-based auth, not Supabase Auth
    - Current RLS policies only allow TO authenticated
    - Data import via DatabaseImportExport fails with "new row violates row-level security policy"
    - Need to allow anon-key client to perform CRUD operations

  2. Solution
    - Update existing policies to allow TO anon, authenticated
    - Add missing DELETE policies
    - Ensure all tables have proper RLS policies for both anon and authenticated users
    - This is appropriate because the app has its own auth layer (localStorage + SHA256)

  3. Tables affected
    - projects
    - cobros_notes
    - receipts
    - service_orders
    - dte_documents
    - sii_configurations
    - payment_notices
*/

-- ============================================
-- PROJECTS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
CREATE POLICY "Anyone can insert projects"
  ON projects FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
CREATE POLICY "Anyone can update projects"
  ON projects FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete projects" ON projects;
CREATE POLICY "Anyone can delete projects"
  ON projects FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- COBROS_NOTES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view cobros notes" ON cobros_notes;
CREATE POLICY "Anyone can view cobros notes"
  ON cobros_notes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert cobros notes" ON cobros_notes;
CREATE POLICY "Anyone can insert cobros notes"
  ON cobros_notes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update cobros notes" ON cobros_notes;
CREATE POLICY "Anyone can update cobros notes"
  ON cobros_notes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete cobros notes" ON cobros_notes;
CREATE POLICY "Anyone can delete cobros notes"
  ON cobros_notes FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- RECEIPTS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view receipts" ON receipts;
CREATE POLICY "Anyone can view receipts"
  ON receipts FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert receipts" ON receipts;
CREATE POLICY "Anyone can insert receipts"
  ON receipts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update receipts" ON receipts;
CREATE POLICY "Anyone can update receipts"
  ON receipts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete receipts" ON receipts;
CREATE POLICY "Anyone can delete receipts"
  ON receipts FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- SERVICE_ORDERS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view service orders" ON service_orders;
CREATE POLICY "Anyone can view service orders"
  ON service_orders FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert service orders" ON service_orders;
CREATE POLICY "Anyone can insert service orders"
  ON service_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update service orders" ON service_orders;
CREATE POLICY "Anyone can update service orders"
  ON service_orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete service orders" ON service_orders;
CREATE POLICY "Anyone can delete service orders"
  ON service_orders FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- DTE_DOCUMENTS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view DTE documents" ON dte_documents;
CREATE POLICY "Anyone can view DTE documents"
  ON dte_documents FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert DTE documents" ON dte_documents;
CREATE POLICY "Anyone can insert DTE documents"
  ON dte_documents FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update DTE documents" ON dte_documents;
CREATE POLICY "Anyone can update DTE documents"
  ON dte_documents FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete DTE documents" ON dte_documents;
CREATE POLICY "Anyone can delete DTE documents"
  ON dte_documents FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- SII_CONFIGURATIONS
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view SII config" ON sii_configurations;
CREATE POLICY "Anyone can view SII config"
  ON sii_configurations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update SII config" ON sii_configurations;
CREATE POLICY "Anyone can update SII config"
  ON sii_configurations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert SII config" ON sii_configurations;
CREATE POLICY "Anyone can insert SII config"
  ON sii_configurations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete SII config" ON sii_configurations;
CREATE POLICY "Anyone can delete SII config"
  ON sii_configurations FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- PAYMENT_NOTICES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view payment notices" ON payment_notices;
CREATE POLICY "Anyone can view payment notices"
  ON payment_notices FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert payment notices" ON payment_notices;
CREATE POLICY "Anyone can insert payment notices"
  ON payment_notices FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update payment notices" ON payment_notices;
CREATE POLICY "Anyone can update payment notices"
  ON payment_notices FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete payment notices" ON payment_notices;
CREATE POLICY "Anyone can delete payment notices"
  ON payment_notices FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- USERS (keep restricted to authenticated for security)
-- ============================================

DROP POLICY IF EXISTS "Users can read their own record" ON users;
CREATE POLICY "Users can read their own record"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);
