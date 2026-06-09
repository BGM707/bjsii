/*
  # Backfill user_id on existing records

  1. Problem
    - Existing records were created before user_id defaults were set
    - New RLS policies require user_id to match the app owner UUID
    - Records without user_id cannot be updated or deleted

  2. Solution
    - Update all existing records to set user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171'
    - This is safe because all data belongs to the single app instance
*/

UPDATE projects SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE cobros_notes SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE receipts SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE service_orders SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE dte_documents SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE payment_notices SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE sii_configurations SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE sii_company_data SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE sii_dtes_sync SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE sii_financial_summary SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE sii_sessions SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
UPDATE sii_sync_logs SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;
