-- Tabla de logs/historial para movimientos de caja
CREATE TABLE IF NOT EXISTS cash_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_number text,
  description text,
  amount numeric,
  previous_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Indice para busquedas por fecha
CREATE INDEX IF NOT EXISTS idx_cash_logs_created_at ON cash_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_logs_entity_type ON cash_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_cash_logs_action ON cash_logs(action);

-- Habilitar RLS
ALTER TABLE cash_logs ENABLE ROW LEVEL SECURITY;

-- Politicas de acceso
CREATE POLICY "select_own_cash_logs" ON cash_logs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_cash_logs" ON cash_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- Comentario
COMMENT ON TABLE cash_logs IS 'Registro historico de acciones en modulo de caja y ventas';