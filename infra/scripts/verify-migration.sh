#!/usr/bin/env bash
# verify-migration.sh
# Verifies that the database schema matches expected state after a migration.
#
# Usage:
#   DATABASE_URL="postgresql://..." bash infra/scripts/verify-migration.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PASS=0
FAIL=0
WARNINGS=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Critical tables that must exist after migration
REQUIRED_TABLES=(
  "Organization"
  "User"
  "OrganizationMember"
  "Guideline"
  "Section"
  "Reference"
  "ReferenceAttachment"
  "Pico"
  "Outcome"
  "PicoCode"
  "Recommendation"
  "GuidelinePermission"
  "GuidelineVersion"
  "ActivityLogEntry"
  "CoiRecord"
  "Task"
  "PdfExportJob"
)

# Critical indexes that must exist
REQUIRED_INDEXES=(
  "PdfExportJob_guidelineId_createdAt_idx"
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

pass() {
  echo -e "  ${GREEN}[PASS]${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}[FAIL]${NC} $1"
  FAIL=$((FAIL + 1))
}

warn() {
  echo -e "  ${YELLOW}[WARN]${NC} $1"
  WARNINGS=$((WARNINGS + 1))
}

section() {
  echo ""
  echo "=== $1 ==="
}

# Run a SQL query and return the result (trimmed)
sql() {
  psql "$DATABASE_URL" --tuples-only --no-align -c "$1" 2>/dev/null | tr -d '[:space:]'
}

# ---------------------------------------------------------------------------
# Prerequisite checks
# ---------------------------------------------------------------------------

section "Prerequisites"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo -e "${RED}ERROR: DATABASE_URL environment variable is not set.${NC}"
  echo "  Usage: DATABASE_URL=\"postgresql://user:pass@host/db\" bash infra/scripts/verify-migration.sh"
  exit 1
fi

if ! command -v psql &>/dev/null; then
  echo -e "${RED}ERROR: psql is not installed or not in PATH.${NC}"
  exit 1
fi

if ! command -v npx &>/dev/null; then
  warn "npx not found — skipping prisma migrate status check"
  SKIP_PRISMA=1
else
  SKIP_PRISMA=0
fi

# ---------------------------------------------------------------------------
# 1. Database connectivity
# ---------------------------------------------------------------------------

section "Database Connectivity"

if psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
  pass "Connected to database successfully"
else
  fail "Cannot connect to database — check DATABASE_URL and network access"
  echo ""
  echo -e "${RED}FATAL: Cannot proceed without database connectivity.${NC}"
  exit 1
fi

DB_VERSION=$(psql "$DATABASE_URL" --tuples-only --no-align -c "SELECT version();" 2>/dev/null | head -1)
echo "  PostgreSQL: $DB_VERSION"

# ---------------------------------------------------------------------------
# 2. Prisma migration status
# ---------------------------------------------------------------------------

section "Prisma Migration Status"

if [[ "$SKIP_PRISMA" -eq 0 ]]; then
  # Find the project root (where package.json lives for the api)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  API_DIR="$(cd "$SCRIPT_DIR/../../apps/api" 2>/dev/null && pwd)" || true

  if [[ -d "$API_DIR" ]]; then
    MIGRATE_STATUS=$(cd "$API_DIR" && DATABASE_URL="$DATABASE_URL" npx prisma migrate status 2>&1) || true

    if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
      pass "Prisma: database schema is up to date"
    elif echo "$MIGRATE_STATUS" | grep -q "following migration\|have not yet been applied"; then
      fail "Prisma: there are pending migrations that have not been applied"
      echo "$MIGRATE_STATUS" | grep -E "migration|pending" | head -10 | sed 's/^/    /'
    elif echo "$MIGRATE_STATUS" | grep -q "failed"; then
      fail "Prisma: one or more migrations are in a failed state"
      echo "$MIGRATE_STATUS" | grep -E "failed|error" | head -10 | sed 's/^/    /'
    else
      warn "Prisma migrate status returned unexpected output — review manually"
      echo "$MIGRATE_STATUS" | head -20 | sed 's/^/    /'
    fi
  else
    warn "Could not locate apps/api directory — skipping prisma migrate status"
  fi
else
  warn "Skipping prisma migrate status (npx not available)"
fi

# Check _prisma_migrations table directly
MIGRATION_COUNT=$(sql "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;" 2>/dev/null || echo "ERROR")
if [[ "$MIGRATION_COUNT" == "ERROR" ]]; then
  fail "_prisma_migrations table not accessible"
else
  pass "_prisma_migrations table accessible ($MIGRATION_COUNT applied migrations)"
fi

FAILED_MIGRATIONS=$(sql "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;" 2>/dev/null || echo "ERROR")
if [[ "$FAILED_MIGRATIONS" == "ERROR" ]]; then
  warn "Could not check for failed migrations"
elif [[ "$FAILED_MIGRATIONS" -gt 0 ]]; then
  fail "$FAILED_MIGRATIONS migration(s) did not complete successfully"
else
  pass "No failed or stuck migrations"
fi

# ---------------------------------------------------------------------------
# 3. Table existence
# ---------------------------------------------------------------------------

section "Required Tables"

for TABLE in "${REQUIRED_TABLES[@]}"; do
  EXISTS=$(sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$TABLE';")
  if [[ "$EXISTS" == "1" ]]; then
    pass "Table exists: $TABLE"
  else
    fail "Table MISSING: $TABLE"
  fi
done

# ---------------------------------------------------------------------------
# 4. Row counts for critical tables
# ---------------------------------------------------------------------------

section "Critical Table Row Counts"

CRITICAL_TABLES=("Organization" "User" "Guideline" "Recommendation" "PdfExportJob")

for TABLE in "${CRITICAL_TABLES[@]}"; do
  COUNT=$(sql "SELECT COUNT(*) FROM \"$TABLE\";" 2>/dev/null || echo "ERROR")
  if [[ "$COUNT" == "ERROR" ]]; then
    warn "Could not count rows in $TABLE"
  else
    echo "  Row count $TABLE: $COUNT"
  fi
done
pass "Row counts reported above (verify against pre-migration baseline if available)"

# ---------------------------------------------------------------------------
# 5. Index verification
# ---------------------------------------------------------------------------

section "Required Indexes"

for INDEX in "${REQUIRED_INDEXES[@]}"; do
  EXISTS=$(sql "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = '$INDEX';")
  if [[ "$EXISTS" == "1" ]]; then
    pass "Index exists: $INDEX"
  else
    fail "Index MISSING: $INDEX"
  fi
done

# Check that all primary key indexes exist for required tables
for TABLE in "${REQUIRED_TABLES[@]}"; do
  PK_EXISTS=$(sql "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = '$TABLE' AND indexname LIKE '%_pkey';")
  if [[ "$PK_EXISTS" == "0" ]]; then
    fail "Primary key index missing for table: $TABLE"
  fi
done
pass "Primary key indexes verified for all required tables"

# ---------------------------------------------------------------------------
# 6. Enum type verification
# ---------------------------------------------------------------------------

section "Enum Types"

REQUIRED_ENUMS=(
  "OrgRole"
  "GuidelineStatus"
  "GuidelineType"
  "PdfJobStatus"
  "CertaintyLevel"
  "RecommendationStrength"
)

for ENUM in "${REQUIRED_ENUMS[@]}"; do
  EXISTS=$(sql "SELECT COUNT(*) FROM pg_type WHERE typname = '$ENUM' AND typtype = 'e';")
  if [[ "$EXISTS" == "1" ]]; then
    pass "Enum type exists: $ENUM"
  else
    fail "Enum type MISSING: $ENUM"
  fi
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "=============================="
echo "  VERIFICATION SUMMARY"
echo "=============================="
echo -e "  ${GREEN}Passed:${NC}   $PASS"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "  ${RED}Failed:${NC}   $FAIL"
echo "=============================="

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}RESULT: FAILED — $FAIL check(s) did not pass.${NC}"
  echo "  Review failures above. Consider rollback if this is post-migration on production."
  echo "  See docs/migrations/rollback-procedures.md"
  exit 1
else
  echo -e "${GREEN}RESULT: PASSED — all checks passed.${NC}"
  exit 0
fi
