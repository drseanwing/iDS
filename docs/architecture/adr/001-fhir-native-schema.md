# ADR-001: FHIR-Native Database Schema

## Status

Accepted

## Context

OpenGRADE needs to support FHIR R5 export to enable interoperability with other healthcare systems. Traditional approaches build an internal schema optimized for the application, then transform data into FHIR format at export time.

This creates problems:
- Impedance mismatch between internal model and FHIR resources
- Export becomes a complex transformation layer
- Schema changes ripple through both internal code and export logic
- No single source of truth for what the data represents

We needed an approach that treats FHIR as a first-class citizen in the database design.

## Decision

We designed the database schema to mirror FHIR R5 resource structures from day one. Each core entity table includes:

- `fhir_resource_type` (ENUM) - discriminator for resource type
- `fhir_id` (UUID) - serves as the canonical `Resource.id` in FHIR
- `fhir_meta` (JSONB) - stores FHIR metadata (versionId, lastUpdated, profile URLs, tags, security labels)
- Domain-specific columns for queryable/indexed fields (e.g., `title`, `status`, `ordering`)
- `fhir_extensions` (JSONB) - overflow for non-standard FHIR extensions that don't warrant dedicated columns

### Example: Recommendation Table

```sql
CREATE TABLE recommendation (
  id UUID PRIMARY KEY,  -- = FHIR Resource.id
  guideline_id UUID NOT NULL,
  fhir_meta JSONB DEFAULT '{}',
  status VARCHAR DEFAULT 'draft',  -- PlanDefinition.status
  title TEXT,  -- PlanDefinition.title
  strength VARCHAR,  -- strong-for, conditional-for, etc.
  certainty_of_evidence VARCHAR,  -- high, moderate, low, very-low
  rationale JSONB,  -- TipTap document
  fhir_extensions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);
```

## Consequences

### Positive

1. **Projection over Transformation**: FHIR export is a simple projection operation (SELECT + JSON assembly) rather than a complex transformation. This is faster and less error-prone.

2. **Single Source of Truth**: The database schema IS the FHIR schema. There's no mismatch between internal representation and FHIR export.

3. **Schema Evolution**: Adding new FHIR fields doesn't require mapping logic. New columns map directly to FHIR properties.

4. **Standards Compliance**: Easier to validate against FHIR profiles and ensure compliance from day one.

5. **Export Simplicity**: FHIR endpoints are straightforward projections, not complex orchestration layers.

### Negative

1. **Less Ergonomic Queries**: Some application queries may need to work around FHIR's hierarchical structure. For example, FHIR codes are deeply nested; we flatten them into queryable columns.

2. **Unused FHIR Fields**: Not all FHIR properties are needed by OpenGRADE. We don't store them in normalized columns; they go into `fhir_extensions` or are omitted.

3. **JSONB Overhead**: Storing FHIR metadata and extensions as JSONB adds storage and serialization overhead compared to fully normalized columns.

4. **Versioning Complexity**: FHIR versioning metadata in `fhir_meta` must be maintained manually rather than relying on ORM features.

## Implementation Notes

- **Projection Services**: Each module includes a FHIR projection service that assembles the JSONB into complete FHIR resources.
- **Backward Compatibility**: The internal REST API uses flattened DTOs for ergonomics; the `/fhir/*` endpoints serve canonical FHIR bundles.
- **Migration Path**: If we ever need to denormalize further, we can add computed columns or materialized views without breaking the conceptual model.

## Related ADRs

- [ADR-006: FHIR Facade Endpoints](./006-fhir-facade-endpoints.md) - How we expose FHIR resources via REST

## Further Reading

- [FHIR R5 Specification](https://www.hl7.org/fhir/R5/)
- OpenGRADE Architecture: Section 1.2 (FHIR-Native Schema Philosophy)
