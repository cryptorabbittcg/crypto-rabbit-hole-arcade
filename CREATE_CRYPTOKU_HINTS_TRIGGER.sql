-- =====================================================
-- STEP 3: CREATE TRIGGER
-- =====================================================
-- Run this AFTER the table is created
-- =====================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_cryptoku_hints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_cryptoku_hints_updated_at ON cryptoku_hints;
CREATE TRIGGER update_cryptoku_hints_updated_at
  BEFORE UPDATE ON cryptoku_hints
  FOR EACH ROW
  EXECUTE FUNCTION update_cryptoku_hints_updated_at();

-- =====================================================
-- VERIFY TRIGGER WAS CREATED
-- =====================================================
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgrelid = 'cryptoku_hints'::regclass
  AND tgisinternal = false;
