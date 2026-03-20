# Sprint 1 - Fix Plan

**Date**: 2026-03-20
**Sprint**: 1 (first iteration)
**Input**: [sprint-1-issues.md](sprint-1-issues.md)

## Fix Summary

| ID | Severity | Fix | Status |
|----|----------|-----|--------|
| S1-001 | P0 | Change `forbidNonWhitelisted: false` in main.ts | IMPLEMENTED |
| S1-002 | P2 | Add JWT decode to useAuth store init | IMPLEMENTED |
| S1-003 | P2 | Fix ReferencesPage to read `meta.total` instead of `total` | IN PROGRESS |
| S1-004 | P2 | Add i18n keys for page headings in all 3 locales | IN PROGRESS |
| S1-005 | P3 | Extend health route exclude to cover sub-routes | IN PROGRESS |
| S1-006 | P3 | Change build script from `nest build` to `tsc -p tsconfig.json` | IN PROGRESS |

## Additional Work

### User Workflows Doc Fixes (from critic review)
- C1: Replace URL paths with state-based navigation descriptions
- C2: Fix EtD mode names (FOUR_FACTOR, SEVEN_FACTOR, TWELVE_FACTOR)
- C3: Remove nonexistent FHIR-XML export format
- C4: Fix Decision Aid Preview location (inside RecommendationEditorCard)
- C5: Add embeddable widget workflow
- I1: Add Shadow Outcomes workflow
- I2: Fix EtD panel location (in RecommendationEditorCard, not Evidence tab)
- I5: Fix wrong screen reference (S02 → correct ID)
- I7: Correct RecoverPanel scope (sections and guidelines only)
- I8: Fix Dashboard description to match actual implementation

## Verification Plan

After all fixes:
1. Rebuild API (`tsc -p tsconfig.json`)
2. Restart API server
3. Verify all workspace endpoints return 200 (sections, recommendations, versions, tasks, polls, activity, coi, comments)
4. Verify `/health` and `/health/ready` both work
5. Verify references page count matches data length
6. Run Playwright browser tests on workspace tabs
7. Lint check on modified files
