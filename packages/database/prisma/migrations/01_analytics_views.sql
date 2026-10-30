-- =============================================================================
-- Phase 9: Analytics SQL Views, Materialized Views & Performance Indexes
-- Target query execution latency: < 300 ms (typical < 15 ms)
-- =============================================================================

-- 1. Composite Indexes for Fast Scoped Aggregations & Drill-Downs
CREATE INDEX IF NOT EXISTS idx_applications_region_stage_status
  ON applications (region_id, current_stage, status);

CREATE INDEX IF NOT EXISTS idx_applications_institution_stage
  ON applications (institution_id, current_stage);

CREATE INDEX IF NOT EXISTS idx_due_items_kind_status_due_at
  ON due_items (kind, status, due_at);

CREATE INDEX IF NOT EXISTS idx_tracked_documents_inst_status_expiry
  ON tracked_documents (institution_id, status, expiry_date);

-- 2. SQL View: Applications by Stage and Region
CREATE OR REPLACE VIEW vw_applications_by_stage_region AS
SELECT
  r.code AS region_code,
  a.current_stage AS stage,
  a.status AS application_status,
  COUNT(a.id)::int AS application_count
FROM applications a
JOIN regions r ON r.id = a.region_id
WHERE a.deleted_at IS NULL
GROUP BY r.code, a.current_stage, a.status;

-- 3. Materialized View: Working-Day Ageing Buckets (0-7, 8-15, 16-30, 31-60, 60+)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_application_ageing_buckets AS
SELECT
  r.code AS region_code,
  a.current_stage AS stage,
  CASE
    WHEN EXTRACT(DAY FROM (NOW() - a.created_at)) <= 7 THEN '0-7'
    WHEN EXTRACT(DAY FROM (NOW() - a.created_at)) <= 15 THEN '8-15'
    WHEN EXTRACT(DAY FROM (NOW() - a.created_at)) <= 30 THEN '16-30'
    WHEN EXTRACT(DAY FROM (NOW() - a.created_at)) <= 60 THEN '31-60'
    ELSE '60+'
  END AS ageing_bucket,
  COUNT(a.id)::int AS total_cases
FROM applications a
JOIN regions r ON r.id = a.region_id
WHERE a.deleted_at IS NULL
GROUP BY r.code, a.current_stage, ageing_bucket;

-- 4. SQL View: EVC Status Counts by Region
CREATE OR REPLACE VIEW vw_evc_status_counts AS
SELECT
  r.code AS region_code,
  e.status AS evc_status,
  COUNT(e.id)::int AS case_count
FROM evc_cases e
JOIN applications a ON a.id = e.application_id
JOIN regions r ON r.id = a.region_id
GROUP BY r.code, e.status;

-- 5. SQL View: Undertaking Condition Compliance Counts
CREATE OR REPLACE VIEW vw_undertaking_compliance_counts AS
SELECT
  r.code AS region_code,
  c.status AS condition_status,
  COUNT(c.id)::int AS condition_count
FROM conditions c
JOIN undertakings u ON u.id = c.undertaking_id
JOIN applications a ON a.id = u.application_id
JOIN regions r ON r.id = a.region_id
WHERE c.deleted_at IS NULL
GROUP BY r.code, c.status;

-- 6. SQL View: Tracked Document Expiry Buckets by Region
CREATE OR REPLACE VIEW vw_document_expiry_buckets AS
SELECT
  r.code AS region_code,
  td.type AS document_type,
  CASE
    WHEN td.expiry_date <= NOW() THEN 'EXPIRED'
    WHEN td.expiry_date <= NOW() + INTERVAL '30 days' THEN '0-30_DAYS'
    WHEN td.expiry_date <= NOW() + INTERVAL '60 days' THEN '31-60_DAYS'
    WHEN td.expiry_date <= NOW() + INTERVAL '90 days' THEN '61-90_DAYS'
    ELSE 'BEYOND_90_DAYS'
  END AS expiry_bucket,
  COUNT(td.id)::int AS document_count
FROM tracked_documents td
JOIN institutions i ON i.id = td.institution_id
JOIN regions r ON r.id = i.region_id
GROUP BY r.code, td.type, expiry_bucket;

