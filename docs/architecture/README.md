# Architecture Documentation

OpenGRADE's architecture is documented through Architecture Decision Records (ADRs) and sequence diagrams. This section provides an index of key architectural decisions and visual workflows.

## Table of Contents

### Architecture Decision Records (ADRs)

ADRs document major technical decisions, their context, and consequences. They serve as a historical record of why the system is built the way it is.

1. **[ADR-001: FHIR-Native Database Schema](./adr/001-fhir-native-schema.md)**
   - How entities are mapped to FHIR resources in the database

2. **[ADR-002: NestJS Module Boundaries](./adr/002-nestjs-module-boundaries.md)**
   - Module ownership patterns and cross-module communication

3. **[ADR-003: TipTap Rich Text Editor](./adr/003-tiptap-rich-text.md)**
   - Document model for rich text content and track changes

4. **[ADR-004: RBAC Authorization Model](./adr/004-rbac-authorization.md)**
   - Role-based access control at organization and guideline levels

5. **[ADR-005: Async PDF Generation Pipeline](./adr/005-async-pdf-generation.md)**
   - Background job model for document export with S3 storage

6. **[ADR-006: FHIR Facade Endpoints](./adr/006-fhir-facade-endpoints.md)**
   - Read-only projection layer for FHIR compliance

### Sequence Diagrams

Sequence diagrams visualize the flow of data and interactions between system components during key workflows.

1. **[Publish Workflow](./sequences/publish-workflow.md)**
   - Creating and publishing guideline snapshots with S3 storage

2. **[PDF Export Workflow](./sequences/pdf-export-workflow.md)**
   - Async PDF/DOCX generation with background job processing

3. **[Import Workflow](./sequences/import-workflow.md)**
   - Importing guidelines with transactional consistency

4. **[Voting Workflow](./sequences/voting-workflow.md)**
   - Poll creation, COI checking, and vote tallying

## How to Add New ADRs

When making significant architectural decisions:

1. **Create a new file** in the `adr/` directory following the naming convention: `NNN-short-description.md`
2. **Use the standard ADR template:**
   ```
   # ADR-NNN: Title

   ## Status

   [Proposed / Accepted / Deprecated / Superseded]

   ## Context

   Describe the issue we're addressing and why it matters.

   ## Decision

   Explain what we decided and why.

   ## Consequences

   List positive and negative effects of this decision.
   ```
3. **Update this README** to add the new ADR to the index
4. **Include related diagrams** in the `sequences/` directory if the decision affects workflows
5. **Reference related ADRs** using inline links

## Design Principles

OpenGRADE's architecture is guided by these principles:

- **FHIR-Native**: Database schema mirrors FHIR R5 resources from day one
- **Module Clarity**: Each NestJS module owns its domain completely
- **Async First**: Long-running operations use background jobs with S3 storage
- **Type Safety**: TypeScript and Prisma ensure compile-time safety
- **Event-Driven**: Modules communicate via EventEmitter2 for loose coupling
- **Standards Compliance**: FHIR facade provides standards-compliant export

## Key Concepts

### FHIR Resource Projection

Rather than transforming internal data into FHIR format at export time, OpenGRADE stores entities that mirror FHIR resource structures. This means FHIR export is a simple projection operation (SELECT + JSON assembly) rather than a complex transformation.

### Module Boundaries

Each module in `apps/api/src/` owns:
- Database entities (Prisma models)
- REST controllers and DTOs
- Service layer (business logic)
- Event emitters (cross-module communication)
- FHIR projection service

Cross-module communication happens through EventEmitter2, enabling future migration to microservices without changing the communication pattern.

### Async Pipeline

PDF generation, document export, and other long-running operations use a consistent pattern:

1. User requests export → creates Job record
2. Return jobId immediately
3. Background process handles generation
4. Upload results to S3
5. Client polls for status
6. Download from S3 when ready

## Related Documentation

- [OpenGRADE Architecture Specification](../../opengrade-architecture.md) - Complete system architecture
- [API Documentation](../api/) - REST endpoint reference
- [Database Schema](../database/) - Detailed Prisma schema documentation
