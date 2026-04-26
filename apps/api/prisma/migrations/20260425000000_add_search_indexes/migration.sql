-- Enable pg_trgm extension (needed for fuzzy/trigram search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text GIN index on Reference (title + authors + abstract)
CREATE INDEX IF NOT EXISTS idx_reference_fts ON "Reference"
  USING gin(to_tsvector('english',
    coalesce(title,'') || ' ' || coalesce(authors,'') || ' ' || coalesce(abstract,'')));

-- Trigram index for fuzzy reference title deduplication
CREATE INDEX IF NOT EXISTS idx_reference_title_trgm ON "Reference"
  USING gin(title gin_trgm_ops);

-- Activity log composite for dashboard queries
CREATE INDEX IF NOT EXISTS idx_activity_guideline_recent ON "ActivityLogEntry"
  (guideline_id, timestamp DESC)
  INCLUDE (action_type, entity_type, user_id);

-- PICO code lookups for clinical integration
CREATE INDEX IF NOT EXISTS idx_pico_code_system ON "PicoCode" (code_system, code);

-- Guideline version lookups
CREATE INDEX IF NOT EXISTS idx_version_guideline_published ON "GuidelineVersion"
  (guideline_id, published_at DESC);
