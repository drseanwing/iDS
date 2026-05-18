# Adult ALS Seed Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load the adult advanced life support 2025-2026 seed specification into OpenGRADE as a real guideline with sections, references, PICOs, outcomes, recommendations, EtD factors, tags, and join-table links.

**Architecture:** Add a full-domain seed importer separate from the existing lightweight `GuidelinesService.importGuideline()` path. Keep seed-package validation and transactional persistence in focused files, keep the ALS content as a versioned JSON seed artifact, and expose the import through an explicit API endpoint plus an operator script so production writes are deliberate.

**Tech Stack:** NestJS, Prisma, Jest, TypeScript, OpenGRADE Prisma schema, TipTap JSON rich text, JSON seed package.

---

## Current Context

The seed content specification is in `docs/database/adult-als-2025-2026-seed-data-spec.md`. It is documentation only and must not be imported until this plan has been implemented and tested.

The current API import method is `GuidelinesService.importGuideline()` in `apps/api/src/guidelines/guidelines.service.ts`. It only creates guideline metadata, sections, and references. It does not import PICOs, outcomes, recommendations, EtD factors, tags, practical issues, EMR elements, or join rows.

The target schema entities are in `apps/api/prisma/schema.prisma`: `Guideline`, `Section`, `Reference`, `Pico`, `Outcome`, `Recommendation`, `EtdFactor`, `EtdJudgment`, `PracticalIssue`, `PicoCode`, `Tag`, `SectionReference`, `SectionPico`, `SectionRecommendation`, `PicoRecommendation`, `OutcomeReference`, and `RecommendationTag`.

## File Map

- Create `apps/api/src/guidelines/seed-import/seed-package.types.ts`: TypeScript interfaces for the seed package and imported stats.
- Create `apps/api/src/guidelines/seed-import/seed-package.validator.ts`: Runtime validation for required keys, enum values, duplicate keys, parent references, and link references.
- Create `apps/api/src/guidelines/seed-import/seed-rich-text.ts`: Helpers for TipTap document values and plain-text conversion.
- Create `apps/api/src/guidelines/seed-import/seed-import.service.ts`: Transactional importer that maps local keys to UUIDs and creates rows in dependency order.
- Create `apps/api/src/guidelines/seed-import/seed-import.service.spec.ts`: Jest unit tests for validation failures and transactional creation order.
- Modify `apps/api/src/guidelines/guidelines.module.ts`: Register `SeedImportService`.
- Modify `apps/api/src/guidelines/guidelines.controller.ts`: Add an explicit `POST /guidelines/import/seed-package` endpoint guarded by existing auth/RBAC behavior.
- Create `apps/api/prisma/seed-data/adult-als-2025-2026.seed.json`: The concrete ALS package translated from the spec.
- Create `apps/api/prisma/import-adult-als-seed.ts`: Operator script that loads the JSON package and calls the importer or uses the same import helpers.
- Modify `apps/api/package.json`: Add `prisma:seed:adult-als` script that runs the operator script.
- Create `docs/database/adult-als-2025-2026-import-runbook.md`: Staging and production runbook with dry-run, backup, import, validation, and rollback steps.

## Task 1: Add Seed Package Types

**Files:**
- Create: `apps/api/src/guidelines/seed-import/seed-package.types.ts`

- [ ] **Step 1: Create the type file**

Add interfaces that mirror the package shape in `docs/database/adult-als-2025-2026-seed-data-spec.md`. Include these exported types:

```ts
export type SeedKey = string;

export interface SeedPackage {
  seedVersion: string;
  packageKey: string;
  sourceCutoffDate: string;
  evidencePolicy?: Record<string, unknown>;
  organizations?: SeedOrganization[];
  users?: SeedUser[];
  organizationMembers?: SeedOrganizationMember[];
  guidelines: SeedGuidelinePackage[];
}

export interface SeedGuidelinePackage {
  key: SeedKey;
  organizationKey?: SeedKey;
  createdByUserKey: SeedKey;
  guideline: Record<string, unknown>;
  permissions?: SeedGuidelinePermission[];
  sections: SeedSection[];
  references: SeedReference[];
  picos: SeedPico[];
  recommendations: SeedRecommendation[];
  tags?: SeedTag[];
  links?: SeedLinks;
}
```

Define concrete interfaces for `SeedOrganization`, `SeedUser`, `SeedOrganizationMember`, `SeedGuidelinePermission`, `SeedSection`, `SeedReference`, `SeedPico`, `SeedOutcome`, `SeedPicoCode`, `SeedPracticalIssue`, `SeedRecommendation`, `SeedEtdFactor`, `SeedEtdJudgment`, `SeedTag`, and `SeedLinks`. Keep enum fields typed as `string` in this file; runtime enum validation happens in Task 2.

- [ ] **Step 2: Add import stats types**

Add:

```ts
export interface SeedImportStats {
  organizations: number;
  users: number;
  organizationMembers: number;
  guidelines: number;
  permissions: number;
  sections: number;
  references: number;
  picos: number;
  outcomes: number;
  recommendations: number;
  etdFactors: number;
  etdJudgments: number;
  tags: number;
  links: number;
}

export interface SeedImportResult {
  guidelineIds: string[];
  stats: SeedImportStats;
}
```

- [ ] **Step 3: Run TypeScript build**

Run:

```bash
npm -w @opengrade/api run build
```

Expected: the build passes, proving the new type-only file compiles.

## Task 2: Add Runtime Validation

**Files:**
- Create: `apps/api/src/guidelines/seed-import/seed-package.validator.ts`
- Test: `apps/api/src/guidelines/seed-import/seed-import.service.spec.ts`

- [ ] **Step 1: Write failing validator tests**

Create tests that call `validateSeedPackage(package)` and expect clear errors for:

- missing `guidelines`
- duplicate section keys
- a section `parentKey` that does not exist
- a PICO without outcomes
- a link to a missing recommendation
- a draft 2026 source recommendation missing `fhirMeta.sourceStatus`
- an invalid enum value, using `strength: "WEAK_FOR"` as the fixture

Run:

```bash
npm -w @opengrade/api test -- seed-import.service.spec.ts
```

Expected: fail because `seed-package.validator.ts` does not exist.

- [ ] **Step 2: Implement `validateSeedPackage`**

Create:

```ts
export class SeedPackageValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Seed package validation failed: ${issues.join('; ')}`);
  }
}

export function validateSeedPackage(seedPackage: SeedPackage): void {
  const issues: string[] = [];
  // populate issues, then throw SeedPackageValidationError if non-empty
}
```

Validate all local keys before DB work. Use allowed enum arrays copied from `apps/api/prisma/schema.prisma` for `GuidelineType`, `GuidelineStatus`, `StudyType`, `OutcomeType`, `OutcomeState`, `CertaintyLevel`, `GradeRating`, `UpgradeRating`, `ImportSource`, `RecommendationStrength`, `RecommendationType`, `RecStatus`, `EtdMode`, `PicoDisplay`, `EtdFactorType`, and `PracticalIssueCategory`.

- [ ] **Step 3: Verify validator tests pass**

Run:

```bash
npm -w @opengrade/api test -- seed-import.service.spec.ts
```

Expected: validator tests pass.

## Task 3: Add Rich Text Helpers

**Files:**
- Create: `apps/api/src/guidelines/seed-import/seed-rich-text.ts`
- Test: `apps/api/src/guidelines/seed-import/seed-import.service.spec.ts`

- [ ] **Step 1: Write failing helper tests**

Add tests for:

- `richText("Plain text")` returns a TipTap doc with one paragraph and one text node.
- `richText(existingTipTapDoc)` returns the same object unchanged.
- `richText(null)` returns `null`.

- [ ] **Step 2: Implement helpers**

Create:

```ts
export function isTipTapDoc(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && (value as any).type === 'doc');
}

export function richText(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (isTipTapDoc(value)) return value;
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: String(value) }],
      },
    ],
  };
}
```

- [ ] **Step 3: Verify helper tests pass**

Run:

```bash
npm -w @opengrade/api test -- seed-import.service.spec.ts
```

Expected: helper tests pass.

## Task 4: Implement Transactional Import Service

**Files:**
- Create: `apps/api/src/guidelines/seed-import/seed-import.service.ts`
- Modify: `apps/api/src/guidelines/guidelines.module.ts`
- Test: `apps/api/src/guidelines/seed-import/seed-import.service.spec.ts`

- [ ] **Step 1: Write failing import test**

Build a minimal package with:

- one organization
- one user
- one guideline
- one permission
- two sections with parent/child relationship
- one reference
- one PICO with one outcome
- one recommendation with one EtD factor and one judgment
- one tag
- section-reference, section-PICO, section-recommendation, PICO-recommendation, outcome-reference, and recommendation-tag links

Mock `PrismaService.$transaction` to execute the callback with a mock `tx`. Assert that:

- all creates happen inside the transaction
- local keys are mapped to generated IDs
- child section receives the created parent ID
- recommendation receives `createdBy` and `updatedBy`
- join tables receive generated IDs, not seed keys
- stats counts match the created rows

Run:

```bash
npm -w @opengrade/api test -- seed-import.service.spec.ts
```

Expected: fail because `SeedImportService` is not implemented.

- [ ] **Step 2: Implement `SeedImportService.importSeedPackage`**

Implement:

```ts
@Injectable()
export class SeedImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importSeedPackage(seedPackage: SeedPackage, organizationId: string, userId: string): Promise<SeedImportResult> {
    validateSeedPackage(seedPackage);
    return this.prisma.$transaction(async (tx) => {
      // create rows and maps in dependency order
    });
  }
}
```

Creation order inside the transaction:

1. Organizations, users, organization memberships.
2. Guidelines and ADMIN permission for the requesting user.
3. Guideline permissions declared by the package.
4. Sections sorted parents-first.
5. References.
6. Tags.
7. PICOs, PICO codes, practical issues, and outcomes.
8. Recommendations, EtD factors, EtD judgments, and EMR elements if present.
9. Join tables.

Use `tx.<model>.create()` rather than `upsert()` for the first implementation. Validation should fail before transaction on duplicate seed keys; database uniqueness should fail on accidental duplicate live data.

- [ ] **Step 3: Register the service**

In `apps/api/src/guidelines/guidelines.module.ts`, add `SeedImportService` to `providers`.

- [ ] **Step 4: Verify service tests pass**

Run:

```bash
npm -w @opengrade/api test -- seed-import.service.spec.ts
```

Expected: all seed import unit tests pass.

## Task 5: Add Explicit API Endpoint

**Files:**
- Modify: `apps/api/src/guidelines/guidelines.controller.ts`
- Test: `apps/api/src/guidelines/seed-import/seed-import.service.spec.ts` or create `apps/api/src/guidelines/guidelines.controller.spec.ts`

- [ ] **Step 1: Add failing controller test**

Test that `POST /guidelines/import/seed-package` passes `req.user.organizationId`, `req.user.id`, and request body to `SeedImportService.importSeedPackage`.

- [ ] **Step 2: Implement endpoint**

Inject `SeedImportService` into `GuidelinesController`. Add:

```ts
@Post('import/seed-package')
@ApiOperation({ summary: 'Import a full OpenGRADE seed package' })
importSeedPackage(@Body() seedPackage: SeedPackage, @Req() req: any) {
  const organizationId = req.user?.organizationId;
  const userId = req.user?.id;
  return this.seedImportService.importSeedPackage(seedPackage, organizationId, userId);
}
```

Keep the existing `POST /guidelines/import` endpoint unchanged so current lightweight imports are not affected.

- [ ] **Step 3: Verify controller build**

Run:

```bash
npm -w @opengrade/api run build
```

Expected: build passes.

## Task 6: Translate ALS Spec To JSON Seed Package

**Files:**
- Create: `apps/api/prisma/seed-data/adult-als-2025-2026.seed.json`
- Read: `docs/database/adult-als-2025-2026-seed-data-spec.md`

- [ ] **Step 1: Create the JSON file from the spec**

Translate the spec into the package shape. Include:

- package metadata with `sourceCutoffDate: "2026-05-18"`
- one guideline shell with `shortName: "adult-als-2025-2026"`
- all canonical references from the spec
- all section rows from the section suite
- all PICO/recommendation suite rows
- outcome templates applied to each PICO
- tags from the tag table
- source status in `fhirMeta.sourceStatus`
- source keys in `fhirMeta.sourceKeys`

- [ ] **Step 2: Validate JSON syntax**

Run:

```bash
jq empty apps/api/prisma/seed-data/adult-als-2025-2026.seed.json
```

Expected: exit code 0.

- [ ] **Step 3: Validate the package with the API test helper**

Add a Jest test that imports the JSON package and calls `validateSeedPackage()`.

Run:

```bash
npm -w @opengrade/api test -- seed-import.service.spec.ts
```

Expected: JSON package validation test passes.

## Task 7: Add Operator Script

**Files:**
- Create: `apps/api/prisma/import-adult-als-seed.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Write script**

The script should:

1. Load `apps/api/prisma/seed-data/adult-als-2025-2026.seed.json`.
2. Read `SEED_ORGANIZATION_ID` and `SEED_USER_ID` from env.
3. Refuse to run unless `CONFIRM_ADULT_ALS_SEED_IMPORT=yes`.
4. Call the same validation and import code used by the API path.
5. Print the imported guideline IDs and stats.

- [ ] **Step 2: Add package script**

In `apps/api/package.json`, add:

```json
"prisma:seed:adult-als": "ts-node prisma/import-adult-als-seed.ts"
```

- [ ] **Step 3: Verify refusal path**

Run without confirmation:

```bash
npm -w @opengrade/api run prisma:seed:adult-als
```

Expected: non-zero exit with a message requiring `CONFIRM_ADULT_ALS_SEED_IMPORT=yes`.

## Task 8: Add Runbook

**Files:**
- Create: `docs/database/adult-als-2025-2026-import-runbook.md`

- [ ] **Step 1: Write the runbook**

Include:

- preflight: `git status --short`, database backup, target org/user selection
- staging import command with env vars
- post-import validation endpoint call
- UI smoke path for guideline, sections, references, PICO, and recommendations
- production import command
- rollback command: delete the imported guideline by ID or restore DB backup
- warning that 2026 ILCOR records tagged `DRAFT_PUBLIC_COMMENT` are not final clinical guidance

- [ ] **Step 2: Validate no placeholders**

Run:

```bash
rg -n "TODO|TBD|fill in|later" docs/database/adult-als-2025-2026-import-runbook.md docs/superpowers/plans/2026-05-18-adult-als-seed-import.md
```

Expected: no matches.

## Task 9: End-To-End Verification Before First Real Import

**Files:**
- No code changes

- [ ] **Step 1: Run API tests**

```bash
npm -w @opengrade/api test -- seed-import.service.spec.ts
npm -w @opengrade/api run build
```

Expected: tests and build pass.

- [ ] **Step 2: Dry-run or staging import**

Use a staging database first. For the local Docker deployment, discover the target organization and user IDs from the staging database before running the import:

```bash
SEED_ORGANIZATION_ID="$(
  docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U opengrade -d opengrade -tAc 'select id from "Organization" order by "createdAt" limit 1'
)"
SEED_USER_ID="$(
  docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U opengrade -d opengrade -tAc 'select id from "User" order by "createdAt" limit 1'
)"
test -n "$SEED_ORGANIZATION_ID"
test -n "$SEED_USER_ID"

CONFIRM_ADULT_ALS_SEED_IMPORT=yes \
SEED_ORGANIZATION_ID="$SEED_ORGANIZATION_ID" \
SEED_USER_ID="$SEED_USER_ID" \
npm -w @opengrade/api run prisma:seed:adult-als
```

Expected: one guideline ID printed and stats counts matching the JSON package.

- [ ] **Step 3: Validate imported guideline**

Call:

```bash
: "${ACCESS_TOKEN:?Set ACCESS_TOKEN to a bearer token for the staging user}"
: "${GUIDELINE_ID:?Set GUIDELINE_ID to the imported guideline ID printed by the seed script}"
curl -sS -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "https://ids.vps.resuseducation.com/api/guidelines/${GUIDELINE_ID}/validate" | jq .
```

Expected: `valid` is `true`; warnings are reviewed and accepted only if they are documented draft-evidence limitations.

- [ ] **Step 4: Playwright UI smoke**

Run a browser smoke that logs in, opens the imported guideline, and verifies:

- section tree renders
- references page includes ERC 2025 Adult ALS and ILCOR 2025 ALS CoSTR
- a PICO page includes outcomes
- a recommendation page includes EtD factors and source tags

Expected: no console errors, no failed API requests, and all checked content visible.

## Do Not Do In This Plan

- Do not import directly into production before staging verification.
- Do not mark 2026 draft/public-comment ILCOR pages as final guidance.
- Do not set `isPublic: true` on the imported guideline until a version is published.
- Do not reuse the existing lightweight `POST /guidelines/import` behavior for full seed imports without adding full-domain entity support.
