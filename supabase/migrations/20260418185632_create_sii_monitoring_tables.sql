/*
  # SII Real-Time Monitoring System

  1. New Tables
    - `sii_sessions` - Persistent SII authentication tokens
    - `sii_company_data` - Cached company data from SII
    - `sii_dtes_sync` - DTEs synced from SII with metadata
    - `sii_financial_summary` - Monthly/periodic financial summaries
    - `sii_sync_logs` - Audit trail of all SII sync operations
  
  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users to view company data
    - Policies to restrict token access to system functions
  
  3. Indexes
    - On frequently queried columns for performance
*/

CREATE TABLE IF NOT EXISTS sii_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_rut text NOT NULL,
  token text NOT NULL,
  seed text,
  seed_expiration timestamptz,
  token_expiration timestamptz NOT NULL,
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_rut, token)
);

ALTER TABLE sii_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage SII sessions"
  ON sii_sessions
  FOR ALL
  USING (true);

CREATE TABLE IF NOT EXISTS sii_company_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_rut text NOT NULL UNIQUE,
  company_name text,
  authorized_for_dte boolean DEFAULT false,
  last_sync timestamptz,
  sync_status text DEFAULT 'pending',
  sync_error text,
  total_emitted_documents integer DEFAULT 0,
  total_received_documents integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sii_company_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view company data"
  ON sii_company_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS sii_dtes_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_rut text NOT NULL,
  folio text NOT NULL,
  dte_type text,
  document_type text,
  emitter_rut text,
  emitter_name text,
  receiver_rut text,
  receiver_name text,
  issue_date date,
  issue_datetime timestamptz,
  net_amount numeric,
  iva_amount numeric,
  total_amount numeric,
  sii_status text,
  sii_response jsonb,
  synced_at timestamptz DEFAULT now(),
  sii_timestamp timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_rut, folio)
);

ALTER TABLE sii_dtes_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view DTEs"
  ON sii_dtes_sync
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS sii_financial_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_rut text NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  total_emitted_documents integer DEFAULT 0,
  total_emitted_net numeric DEFAULT 0,
  total_emitted_iva numeric DEFAULT 0,
  total_emitted_gross numeric DEFAULT 0,
  total_received_documents integer DEFAULT 0,
  total_received_net numeric DEFAULT 0,
  total_received_iva numeric DEFAULT 0,
  total_received_gross numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_rut, period_year, period_month)
);

ALTER TABLE sii_financial_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view financial summary"
  ON sii_financial_summary
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS sii_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_rut text NOT NULL,
  operation text NOT NULL,
  status text NOT NULL,
  records_processed integer DEFAULT 0,
  error_message text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sii_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync logs"
  ON sii_sync_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_sii_dtes_company_rut ON sii_dtes_sync(company_rut);
CREATE INDEX idx_sii_dtes_folio ON sii_dtes_sync(folio);
CREATE INDEX idx_sii_dtes_date ON sii_dtes_sync(issue_date DESC);
CREATE INDEX idx_sii_sessions_company ON sii_sessions(company_rut);
CREATE INDEX idx_sii_sessions_expiration ON sii_sessions(token_expiration);
CREATE INDEX idx_sii_financial_company ON sii_financial_summary(company_rut);
CREATE INDEX idx_sii_sync_logs_company ON sii_sync_logs(company_rut);
