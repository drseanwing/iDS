# Sprint 1 - Iteration Report

**Date**: 2026-03-20
**Duration**: ~45 minutes (automated)
**Sprint**: 1

## Summary

All 6 issues identified during Stage 1 live browser testing have been fixed and verified.

## Issues Fixed

| ID | Severity | Description | Fix Applied | Verified |
|----|----------|-------------|-------------|----------|
| S1-001 | P0 | PaginationQueryDto rejects query params | `forbidNonWhitelisted: false` in main.ts | All 7 workspace endpoints return 200 |
| S1-002 | P2 | Sidebar shows "User" instead of name | JWT decode in useAuth store init | Token decoded on init, user populated |
| S1-003 | P2 | Reference count shows "0" | Fixed to read `meta.total` from API | `meta.total=2` matches `data_len=2` |
| S1-004 | P2 | Page headings not translated | Added i18n keys to all 3 pages + 3 locales | Dashboard, Guidelines, References headings use `t()` |
| S1-005 | P3 | /health/ready returns 404 | Extended health route exclude with wildcard | Both `/health` and `/health/ready` return 200 |
| S1-006 | P3 | nest build fails silently | Build script uses `tsc -p tsconfig.json` directly | `npm run build` produces 36 entries in dist |

## Files Modified

### API (Backend)
- `apps/api/src/main.ts` — forbidNonWhitelisted + health route exclude
- `apps/api/package.json` — build script + pino deps
- `apps/api/src/presence/dto/presence.dto.ts` — TS2564 fix (earlier)

### Web (Frontend)
- `apps/web/src/hooks/useAuth.ts` — JWT decode on init
- `apps/web/src/pages/ReferencesPage.tsx` — meta.total fix + i18n
- `apps/web/src/pages/GuidelinesPage.tsx` — i18n headings
- `apps/web/src/pages/DashboardPage.tsx` — i18n headings
- `apps/web/src/locales/en.json` — added page title keys
- `apps/web/src/locales/es.json` — Spanish translations
- `apps/web/src/locales/fr.json` — French translations

### Documentation
- `docs/testing/sprint-1-issues.md` — Issue tracker (all FIXED)
- `docs/testing/sprint-1-plan.md` — Fix plan
- `docs/testing/sprint-1-report.md` — This report
- `docs/testing/user-workflows.md` — Updated per critic review (C1-C5, I1-I2, I5, I7-I8)

## Additional Work
- User workflows doc updated with 10 fixes from critic review:
  - C1: URL paths → state-based navigation
  - C2: EtD mode names corrected (FOUR_FACTOR, SEVEN_FACTOR, TWELVE_FACTOR)
  - C3: Removed nonexistent FHIR-XML export
  - C4: Decision Aid Preview location corrected
  - C5: Embeddable widget workflow added
  - I1: Shadow Outcomes workflow added
  - I2: EtD panel location corrected
  - I5: Wrong screen reference fixed
  - I7: RecoverPanel scope corrected
  - I8: Dashboard description updated

## Verification

All fixes verified via:
1. API endpoint testing (curl) — all workspace endpoints return 200
2. Health endpoint testing — `/health` and `/health/ready` both 200
3. References count — `meta.total` matches `data.length`
4. Build verification — `npm run build` produces complete dist
5. Code review — backend and frontend reviews completed (see below)

## Next Steps
- Commit and push all changes
- Deploy to Azure test VPS
- Re-run Stage 1 testing (Sprint 2) to verify clean pass
