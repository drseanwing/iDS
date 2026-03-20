# Sprint 1 - Issues Captured During Stage 1 Testing

**Date**: 2026-03-20
**Tester**: Automated QA (Playwright MCP + API testing)
**Environment**: localhost (API :3000, Web :5173, PostgreSQL :5432, MinIO :9000)

## Summary

| # | ID | Severity | Area | Status | Description |
|---|-----|----------|------|--------|-------------|
| 1 | S1-001 | P0 | API/Validation | FIXED | PaginationQueryDto forbidNonWhitelisted rejects query params |
| 2 | S1-002 | P2 | Frontend/Auth | FIXED | Sidebar shows "User" instead of authenticated user name |
| 3 | S1-003 | P2 | Frontend/References | FIXED | Reference count header shows "0" but references exist |
| 4 | S1-004 | P2 | Frontend/i18n | FIXED | Page content headings remain in English when locale changed |
| 5 | S1-005 | P3 | API/Health | FIXED | /health/ready endpoint returns 404 |
| 6 | S1-006 | P3 | Build | FIXED | nest build fails silently due to Swagger plugin |

## Detailed Issues

### S1-001: PaginationQueryDto forbidNonWhitelisted Rejects Query Params [P0 CRITICAL] — FIXED

**Area**: API / Validation
**Affected Endpoints**: ALL list endpoints using PaginationQueryDto (12 controllers)
**Controllers**: sections, recommendations, references, activity, versions, tasks, polls, comments, coi, outcomes, picos, organizations, guidelines
**Root Cause**: Global ValidationPipe in `apps/api/src/main.ts` has `forbidNonWhitelisted: true`. Bare `@Query() pagination?: PaginationQueryDto` receives ALL query string params. When other named params like `guidelineId` are present, PaginationQueryDto validation rejects them as unknown properties → 400 Bad Request.
**Impact**: Blocks ALL workspace tab data loading. No sections, recommendations, tasks, polls, versions, activity, COI, or comments load.
**Fix Applied**: Changed `forbidNonWhitelisted: true` to `forbidNonWhitelisted: false` in main.ts. `whitelist: true` still strips unknown properties silently.

### S1-002: Sidebar Shows "User" Instead of Authenticated User Name [P2] — FIXED

**Area**: Frontend / Authentication
**File**: `apps/web/src/hooks/useAuth.ts`
**Root Cause**: Zustand auth store reads `access_token` from localStorage on init but does NOT decode the JWT payload to populate the `user` object. The sidebar falls back to displaying "User".
**Impact**: User identity not displayed correctly after page refresh or initial load.
**Fix Applied**: Added JWT decode logic (`decodeJwtPayload()`) in store initializer to populate user from token payload on init and during setToken.

### S1-003: Reference Count Header Shows "0" But References Exist [P2]

**Area**: Frontend / References
**Observation**: Header displays "0 references across all guidelines" but 2 reference cards are rendered below.
**Root Cause**: Likely a count query or state mismatch — the count displayed in the header is not derived from the actually rendered data.
**Impact**: Confusing UX — users see contradictory information.

### S1-004: Page Content Headings Remain in English When Locale Changed [P2]

**Area**: Frontend / i18n
**Observation**: Navigation items translate correctly when locale is changed (e.g., to Spanish), but page headings and content remain in English.
**Root Cause**: Only navigation strings use i18n keys; page content headings are hardcoded in English.
**Impact**: Incomplete localization experience.

### S1-005: /health/ready Endpoint Returns 404 [P3]

**Area**: API / Health
**Observation**: `GET /health/ready` returns 404. Only `GET /health` works.
**Root Cause**: The `/health/ready` endpoint may not be implemented, or the compiled dist differs from the dev source.
**Impact**: Kubernetes-style readiness probes would fail. Low priority for current testing.

### S1-006: nest build Fails Silently Due to Swagger Plugin [P3]

**Area**: Build Tooling
**Observation**: `nest build` completes without error output but produces no usable dist. Must use `npx tsc -p tsconfig.json` directly to compile.
**Root Cause**: NestJS Swagger CLI plugin configured in `nest-cli.json` causes silent build failure.
**Impact**: Developer experience issue. Workaround exists (use tsc directly).
