# ADR-002: NestJS Module Boundaries

## Status

Accepted

## Context

OpenGRADE uses NestJS for its backend. NestJS provides a powerful module system that enables clear separation of concerns. However, without explicit guidelines, modules can quickly become tangled through direct service injection and circular dependencies.

We needed a clear contract for what each module owns and how modules interact with each other.

## Decision

Each NestJS module has complete ownership of its domain and follows these boundaries:

### Module Ownership

Each module in `apps/api/src/` owns:

1. **Database Entities** - Prisma models for its domain (e.g., `GuidelinesModule` owns `Guideline`, `Section`, `Recommendation`)
2. **REST Controllers** - HTTP endpoints for its domain
3. **Data Transfer Objects (DTOs)** - Request/response validation schemas
4. **Service Layer** - Business logic and database operations
5. **Event Emitters** - Events that module publishes for other modules to subscribe to
6. **FHIR Projection Service** - Resource serialization for FHIR endpoints

### Cross-Module Communication

**Rule: Never directly inject one module's service into another.**

Instead, modules communicate through:

1. **EventEmitter2** - For asynchronous, loosely-coupled events
2. **Shared DTOs** - Pass data through controller responses, not direct method calls
3. **Core Module** - The `@core` module provides shared dependencies (auth, audit, RBAC, config)

### Example: Publishing a Guideline

When a user publishes a guideline:

```
GuidelinesController (user request)
  → GuidelinesService (publish business logic)
  → PrismaService (update guideline status)
  → EventEmitter2.emit('guideline.published', { guidelineId, ... })

// Other modules subscribe
VersionsService: @OnEvent('guideline.published') → create snapshot
VersionsService: → upload to S3
ActivityService: @OnEvent('guideline.published') → log audit entry
```

This way:
- Guidelines module doesn't know about Versions or Activity
- New features can subscribe to events without modifying Guidelines
- Easy to test in isolation

### Shared Dependencies

Only the `core` module is shared across all modules:

```typescript
// OK: shared from core
import { RbacGuard } from '@core/auth/rbac.guard';
import { AuditInterceptor } from '@core/audit/audit.interceptor';

// NOT OK: cross-module direct injection
import { VersionsService } from '@versions/versions.service'; // ❌ Forbidden

// OK: respond to events
@OnEvent('guideline.published')
async handleGuidelinePublished(event) { ... }
```

## Consequences

### Positive

1. **Clear Ownership**: Each module is responsible for one domain, making the codebase easier to understand.

2. **Testability**: Modules can be tested in isolation without mocking complex dependency graphs.

3. **Loose Coupling**: EventEmitter2 enables modules to communicate without being aware of each other.

4. **Microservice Migration**: This pattern makes it easier to extract modules as microservices later. EventEmitter2 can be replaced with a message queue (RabbitMQ, Kafka) without changing the business logic.

5. **Parallel Development**: Teams can work on different modules without coordination overhead.

### Negative

1. **Event Proliferation**: Complex workflows may emit many events, making them harder to debug.

2. **Eventual Consistency**: Event-driven communication is asynchronous, so data isn't immediately consistent across modules.

3. **Transaction Boundaries**: If module A needs to roll back based on module B's event, we need explicit compensation logic.

4. **Harder Debugging**: Call stacks span multiple async boundaries, making stack traces less informative.

## Implementation Patterns

### Publishing Events

```typescript
// In guidelines.service.ts
async publishGuideline(guidelineId: string) {
  const guideline = await this.prisma.guideline.update({
    where: { id: guidelineId },
    data: { status: 'PUBLISHED' },
  });

  this.eventEmitter.emit('guideline.published', {
    guidelineId,
    publishedAt: new Date(),
    publishedBy: currentUserId,
  });

  return guideline;
}
```

### Subscribing to Events

```typescript
// In versions.service.ts
@OnEvent('guideline.published')
async handleGuidelinePublished(payload: GuidelinePublishedEvent) {
  // Create snapshot, upload to S3, etc.
}
```

### Handling Errors

Events that fail should be logged but not propagate. Use a pattern like:

```typescript
@OnEvent('guideline.published')
async handleGuidelinePublished(payload: GuidelinePublishedEvent) {
  try {
    // Do work
  } catch (error) {
    this.logger.error('Failed to create snapshot', error);
    // Optionally emit a compensation event
    this.eventEmitter.emit('guideline.snapshot-failed', { guidelineId, error });
  }
}
```

## Related ADRs

- [ADR-005: Async PDF Generation Pipeline](./005-async-pdf-generation.md) - Uses event-driven pattern for background jobs

## Further Reading

- [NestJS Module System](https://docs.nestjs.com/modules)
- [NestJS EventEmitter2](https://github.com/nestjs/event-emitter)
- OpenGRADE Architecture: Section 1.3 (Module Boundary Rules)
