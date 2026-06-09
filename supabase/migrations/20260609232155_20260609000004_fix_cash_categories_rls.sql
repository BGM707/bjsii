/*
  # Fix cash_categories RLS policies

  1. Problem
    - cash_categories had USING(true) and WITH CHECK(true) policies
    - These bypass row-level security

  2. Solution
    - Replace with user_id-based policies consistent with other tables
    - Add user_id column with default
    - Backfill existing records
*/

ALTER TABLE cash_categories ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT '3ad18039-cf5a-45e5-badc-2cf93b4af171';

UPDATE cash_categories SET user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171' WHERE user_id IS NULL;

DROP POLICY IF EXISTS "insert_cash_categories" ON cash_categories;
DROP POLICY IF EXISTS "update_cash_categories" ON cash_categories;
DROP POLICY IF EXISTS "delete_cash_categories" ON cash_categories;

CREATE POLICY "insert_cash_categories" ON cash_categories FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

CREATE POLICY "update_cash_categories" ON cash_categories FOR UPDATE
  TO anon, authenticated USING (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171') WITH CHECK (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');

CREATE POLICY "delete_cash_categories" ON cash_categories FOR DELETE
  TO anon, authenticated USING (user_id = '3ad18039-cf5a-45e5-badc-2cf93b4af171');
