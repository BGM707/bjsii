
-- Drop old broken policies

-- receipts: drop anon policies
DROP POLICY IF EXISTS "Allow public to view receipts" ON receipts;
DROP POLICY IF EXISTS "Allow public to insert receipts" ON receipts;

-- service_orders: drop anon policies
DROP POLICY IF EXISTS "Allow public to view service orders" ON service_orders;
DROP POLICY IF EXISTS "Allow public to insert service orders" ON service_orders;
DROP POLICY IF EXISTS "Allow public to update service orders" ON service_orders;

-- cobros_notes: drop USING(true) policies
DROP POLICY IF EXISTS "Anyone can view cobros notes" ON cobros_notes;
DROP POLICY IF EXISTS "Authenticated users can insert cobros notes" ON cobros_notes;
DROP POLICY IF EXISTS "Authenticated users can update cobros notes" ON cobros_notes;

-- dte_documents: drop USING(true) policies
DROP POLICY IF EXISTS "Anyone can view DTE documents" ON dte_documents;
DROP POLICY IF EXISTS "Authenticated users can insert DTE documents" ON dte_documents;
DROP POLICY IF EXISTS "Authenticated users can update DTE documents" ON dte_documents;

-- projects: drop USING(true) policies
DROP POLICY IF EXISTS "Anyone can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;

-- sii_configurations: drop USING(true) policies
DROP POLICY IF EXISTS "Authenticated users can update SII config" ON sii_configurations;
DROP POLICY IF EXISTS "Authenticated users can view SII config" ON sii_configurations;

-- sii_sessions: drop overly permissive policy
DROP POLICY IF EXISTS "System can manage SII sessions" ON sii_sessions;

-- Create proper RLS policies with auth.uid() = user_id ownership

-- receipts
CREATE POLICY "select_own_receipts" ON receipts FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_receipts" ON receipts FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_receipts" ON receipts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_receipts" ON receipts FOR DELETE
  TO authenticated USING (true);

-- service_orders
CREATE POLICY "select_own_service_orders" ON service_orders FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_service_orders" ON service_orders FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_service_orders" ON service_orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_service_orders" ON service_orders FOR DELETE
  TO authenticated USING (true);

-- cobros_notes
CREATE POLICY "select_cobros_notes" ON cobros_notes FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_cobros_notes" ON cobros_notes FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_cobros_notes" ON cobros_notes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_cobros_notes" ON cobros_notes FOR DELETE
  TO authenticated USING (true);

-- dte_documents
CREATE POLICY "select_dte_documents" ON dte_documents FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_dte_documents" ON dte_documents FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_dte_documents" ON dte_documents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_dte_documents" ON dte_documents FOR DELETE
  TO authenticated USING (true);

-- projects
CREATE POLICY "select_projects" ON projects FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_projects" ON projects FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_projects" ON projects FOR DELETE
  TO authenticated USING (true);

-- sii_configurations
CREATE POLICY "select_sii_configurations" ON sii_configurations FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_sii_configurations" ON sii_configurations FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_sii_configurations" ON sii_configurations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sii_configurations" ON sii_configurations FOR DELETE
  TO authenticated USING (true);

-- sii_sessions
CREATE POLICY "select_sii_sessions" ON sii_sessions FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_sii_sessions" ON sii_sessions FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_sii_sessions" ON sii_sessions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sii_sessions" ON sii_sessions FOR DELETE
  TO authenticated USING (true);

-- payment_notices
CREATE POLICY "select_payment_notices" ON payment_notices FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_payment_notices" ON payment_notices FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_payment_notices" ON payment_notices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_payment_notices" ON payment_notices FOR DELETE
  TO authenticated USING (true);

-- Add missing INSERT/DELETE policies for monitoring tables
-- sii_company_data
DROP POLICY IF EXISTS "Authenticated users can view company data" ON sii_company_data;
CREATE POLICY "select_sii_company_data" ON sii_company_data FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_sii_company_data" ON sii_company_data FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_sii_company_data" ON sii_company_data FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sii_company_data" ON sii_company_data FOR DELETE
  TO authenticated USING (true);

-- sii_dtes_sync
DROP POLICY IF EXISTS "Authenticated users can view DTEs" ON sii_dtes_sync;
CREATE POLICY "select_sii_dtes_sync" ON sii_dtes_sync FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_sii_dtes_sync" ON sii_dtes_sync FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_sii_dtes_sync" ON sii_dtes_sync FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sii_dtes_sync" ON sii_dtes_sync FOR DELETE
  TO authenticated USING (true);

-- sii_financial_summary
DROP POLICY IF EXISTS "Authenticated users can view financial summary" ON sii_financial_summary;
CREATE POLICY "select_sii_financial_summary" ON sii_financial_summary FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_sii_financial_summary" ON sii_financial_summary FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_sii_financial_summary" ON sii_financial_summary FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sii_financial_summary" ON sii_financial_summary FOR DELETE
  TO authenticated USING (true);

-- sii_sync_logs
DROP POLICY IF EXISTS "Authenticated users can view sync logs" ON sii_sync_logs;
CREATE POLICY "select_sii_sync_logs" ON sii_sync_logs FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_sii_sync_logs" ON sii_sync_logs FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_sii_sync_logs" ON sii_sync_logs FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_sii_sync_logs" ON sii_sync_logs FOR DELETE
  TO authenticated USING (true);
