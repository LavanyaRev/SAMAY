-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create non-superuser application role so RLS is enforced even when connection pool connects as DB owner/superuser
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'samay_app') THEN
    CREATE ROLE samay_app NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO samay_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO samay_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO samay_app;

-- -------------------------------------------------------------
-- PostgreSQL Row-Level Security (RLS) Policies
-- Enforces statutory jurisdictional isolation at the database layer.
-- -------------------------------------------------------------

-- Enable & force RLS on applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regional_officer_application_isolation ON applications;

CREATE POLICY regional_officer_application_isolation ON applications
  FOR ALL
  USING (
    COALESCE(current_setting('app.current_user_role', true), '') IN ('ADMIN', 'BUREAU_OFFICER', 'COMMITTEE_MEMBER')
    OR (
      current_setting('app.current_user_role', true) = 'REGIONAL_OFFICER'
      AND region_id = NULLIF(current_setting('app.current_user_region_id', true), '')::uuid
    )
    OR (
      current_setting('app.current_user_role', true) = 'INSTITUTION'
      AND institution_id = NULLIF(current_setting('app.current_user_institution_id', true), '')::uuid
    )
    OR (
      current_setting('app.current_user_role', true) IS NULL
      OR current_setting('app.current_user_role', true) = ''
    )
  );

-- Enable & force RLS on institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regional_officer_institution_isolation ON institutions;

CREATE POLICY regional_officer_institution_isolation ON institutions
  FOR ALL
  USING (
    COALESCE(current_setting('app.current_user_role', true), '') IN ('ADMIN', 'BUREAU_OFFICER', 'COMMITTEE_MEMBER')
    OR (
      current_setting('app.current_user_role', true) = 'REGIONAL_OFFICER'
      AND region_id = NULLIF(current_setting('app.current_user_region_id', true), '')::uuid
    )
    OR (
      current_setting('app.current_user_role', true) = 'INSTITUTION'
      AND id = NULLIF(current_setting('app.current_user_institution_id', true), '')::uuid
    )
    OR (
      current_setting('app.current_user_role', true) IS NULL
      OR current_setting('app.current_user_role', true) = ''
    )
  );

-- -------------------------------------------------------------
-- Append-Only Immutability Trigger on audit_log
-- Blocks UPDATE and DELETE operations on the tamper-evident audit ledger.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % operations are strictly prohibited', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable_trigger ON audit_log;

CREATE TRIGGER audit_log_immutable_trigger
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

