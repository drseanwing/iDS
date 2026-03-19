# Import Workflow

## Overview

This sequence diagram shows the flow when a user imports a guideline from a file (JSON or RevMan format). The system parses the file, validates the structure, and creates a new guideline with all sections, recommendations, references, and PICs in a single transaction.

## Process Steps

1. User uploads guideline file (JSON or RevMan XML)
2. Controller validates file format and size
3. GuidelinesService parses the file
4. Sections are recursively created
5. Recommendations are created with links
6. References are imported
7. PICs (Population, Intervention, Comparison, Outcomes) are created
8. Entire import wrapped in transaction for consistency
9. Return new guideline ID to user

## Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Web UI
    participant Controller as GuidelinesController
    participant Service as GuidelinesService
    participant Parser as ImportParser
    participant Validator as SchemaValidator
    participant Prisma as PrismaService
    participant EventBus as EventEmitter2

    User->>UI: Upload guideline file<br/>(JSON or RevMan XML)
    UI->>Controller: POST /guidelines/import<br/>multipart/form-data
    activate Controller

    Note over Controller: Validate file<br/>size, format, type
    Controller->>Controller: validateFile(file)
    alt File Invalid
        Controller-->>UI: 400 Bad Request<br/>"File must be JSON or XML"
    else File Valid
        Controller->>Service: import(userId, file, organizationId)
        activate Service

        Note over Service: Parse file based on type
        Service->>Parser: parseFile(file)
        activate Parser

        alt File Type = JSON
            Parser->>Parser: JSON.parse(fileContent)
            Parser->>Validator: validateAgainstSchema(data)
            activate Validator
            Validator-->>Parser: {valid: true, errors: []}
            deactivate Validator
        else File Type = RevMan XML
            Parser->>Parser: parseRevmanXml(fileContent)
            Parser->>Validator: validateRevmanStructure(data)
            activate Validator
            Validator-->>Parser: {valid: true, errors: []}
            deactivate Validator
        end

        alt Schema Invalid
            Parser-->>Service: SchemaValidationError
            Service-->>Controller: 400 Bad Request
        else Schema Valid
            Parser-->>Service: parsedGuideline
        end
        deactivate Parser

        Note over Service: Begin transaction<br/>to ensure consistency
        Service->>Prisma: transaction(async (tx) => {

            Note over Service: Create guideline record
            Service->>Prisma: tx.guideline.create({<br/>  title,<br/>  organizationId,<br/>  createdBy: userId<br/>})
            activate Prisma
            Prisma-->>Service: guideline
            deactivate Prisma

            Note over Service: Import sections recursively
            par Import Sections
                loop For each top-level section
                    Service->>Prisma: tx.section.create({<br/>  title,<br/>  guidelineId,<br/>  ordering,<br/>  children: [...] (nested)<br/>})
                    activate Prisma
                    Prisma-->>Service: section
                    deactivate Prisma

                    loop For each nested section
                        Service->>Prisma: tx.section.create({<br/>  parentId: section.id<br/>})
                        activate Prisma
                        Prisma-->>Service: nestedSection
                        deactivate Prisma
                    end
                end
            and Import Recommendations
                loop For each recommendation
                    Service->>Prisma: tx.recommendation.create({<br/>  title,<br/>  strength,<br/>  certaintyOfEvidence,<br/>  rationale: json,<br/>  guidelineId<br/>})
                    activate Prisma
                    Prisma-->>Service: recommendation
                    deactivate Prisma

                    Note over Service: Link recommendation to sections
                    loop For each section placement
                        Service->>Prisma: tx.sectionRecommendation.create({<br/>  sectionId,<br/>  recommendationId<br/>})
                        activate Prisma
                        Prisma-->>Service: placement
                        deactivate Prisma
                    end
                end
            and Import References
                loop For each reference/citation
                    Service->>Prisma: tx.reference.create({<br/>  title,<br/>  authors,<br/>  year,<br/>  url,<br/>  doi,<br/>  guidelineId<br/>})
                    activate Prisma
                    Prisma-->>Service: reference
                    deactivate Prisma

                    Note over Service: Link reference to sections
                    loop For each section placement
                        Service->>Prisma: tx.sectionReference.create({<br/>  sectionId,<br/>  referenceId<br/>})
                        activate Prisma
                        Prisma-->>Service: placement
                        deactivate Prisma
                    end
                end
            and Import PICs
                loop For each PICO (Population/Intervention/Comparison/Outcome)
                    Service->>Prisma: tx.pico.create({<br/>  type,<br/>  description,<br/>  codes: [...],<br/>  guidelineId<br/>})
                    activate Prisma
                    Prisma-->>Service: pico
                    deactivate Prisma

                    Note over Service: Create nested outcomes
                    loop For each outcome
                        Service->>Prisma: tx.outcome.create({<br/>  picoId,<br/>  description,<br/>  importance<br/>})
                        activate Prisma
                        Prisma-->>Service: outcome
                        deactivate Prisma
                    end
                end
            end

            Note over Service: Validate referential integrity
            Service->>Service: validateAllLinksResolved()

            Service->>Prisma: })  // end transaction
            deactivate Prisma

        Service-->>Controller: guideline
        deactivate Service

        Note over Controller: Emit event
        Controller->>EventBus: emit('guideline.imported')<br/>{guidelineId, organizationId,<br/>userId, itemCount}
        activate EventBus
        EventBus-->>Controller: ✓
        deactivate EventBus

        Controller-->>UI: 201 Created<br/>{id: guidelineId, title,<br/>stats: {sections: N, recs: M, refs: P}}
    end
    deactivate Controller

    UI->>User: Show success<br/>"Imported X sections,<br/>Y recommendations, Z references"
```

## Key Decisions

### 1. Transaction Wrapper

The entire import is wrapped in a database transaction to ensure:
- All-or-nothing semantics: if any part fails, entire import is rolled back
- No partial imports left in inconsistent state
- Clear visibility into success/failure
- Enables retry with same file

### 2. Parallel Import Operations

Sections, recommendations, references, and PICs are imported in parallel within the transaction to:
- Reduce total import time
- Improve database efficiency (group inserts)
- Make code more maintainable

### 3. Schema Validation

Files are validated against a schema before import to:
- Provide clear error messages about what's wrong
- Prevent corrupted data in the database
- Support both JSON and RevMan XML formats
- Allow extending with custom validation rules

### 4. Recursive Sections

Sections can be nested arbitrarily deep:
```
- Section 1
  - Section 1.1
    - Section 1.1.1
```

The import preserves this hierarchy via `parentId` foreign key.

### 5. Cross-Reference Links

Recommendations, sections, and references are linked via junction tables:
- `SectionRecommendation` - which recommendations appear in which sections
- `SectionReference` - which references support which sections
- `RecommendationPico` - which PICs are relevant to which recommendations

This enables:
- Reusing recommendations across sections
- Seeing full citation network
- Flexible restructuring after import

## Error Handling

### Invalid File Format

```
If file is not JSON or valid XML:
  → 400 Bad Request
  → "File must be valid JSON or RevMan XML"
```

### Schema Validation Failure

```
If parsed data doesn't match expected schema:
  → 400 Bad Request
  → "Validation errors: Field 'title' required in section 3"
```

### Duplicate References

```
If guideline already has a section with same ID:
  → 409 Conflict
  → "Section '{id}' already exists"
  → Transaction rolls back
```

### Circular Section Hierarchy

```
If sections form a loop (A → B → C → A):
  → 400 Bad Request
  → "Circular section hierarchy detected"
  → Transaction rolls back
```

### Missing Required Fields

```
If recommendation is missing required 'strength':
  → 400 Bad Request
  → "Missing required field 'strength' in recommendation {id}"
```

### File Too Large

```
If file > 100MB:
  → 413 Payload Too Large
  → "File size must not exceed 100MB"
```

## Performance Characteristics

| Item Count | Typical Time |
|---|---|
| 10 sections, 20 recommendations, 30 references | ~500-1000ms |
| 50 sections, 100 recommendations, 200 references | ~2000-3000ms |
| 200 sections, 500 recommendations, 1000 references | ~10000-15000ms |

Bottlenecks:
- **File parsing**: ~100-200ms
- **Schema validation**: ~50-100ms
- **Database transaction**: ~200-500ms per 100 items
- **Index updates**: included in transaction time

For very large imports (>1000 items), consider:
- Batch importing in chunks
- Disabling indexes temporarily
- Using COPY command instead of INSERT

## File Format Examples

### JSON Format

```json
{
  "title": "Hypertension Management",
  "description": "...",
  "sections": [
    {
      "id": "sec-1",
      "title": "Introduction",
      "ordering": 1,
      "children": [],
      "recommendations": ["rec-1", "rec-2"]
    }
  ],
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Lifestyle Modifications",
      "strength": "strong-for",
      "certaintyOfEvidence": "high"
    }
  ],
  "references": [
    {
      "id": "ref-1",
      "title": "DASH Diet Study",
      "authors": ["...", "..."],
      "year": 2019,
      "doi": "10.1234/..."
    }
  ],
  "picos": [
    {
      "type": "population",
      "description": "Adults with hypertension",
      "codes": [...]
    }
  ]
}
```

### RevMan XML Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<review>
  <title>Hypertension Management</title>
  <sections>
    <section id="sec-1" title="Introduction">
      <recommendation ref="rec-1"/>
      <recommendation ref="rec-2"/>
    </section>
  </sections>
  <recommendations>
    <recommendation id="rec-1" strength="strong-for">
      <title>Lifestyle Modifications</title>
    </recommendation>
  </recommendations>
</review>
```

## Related Documentation

- [ADR-002: NestJS Module Boundaries](../adr/002-nestjs-module-boundaries.md) - How modules handle imports
- [Guidelines Service API](../../api/guidelines.md) - Import endpoint reference
- [Import Validation Schema](../../api/import-schema.json) - Complete schema definition
