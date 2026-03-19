# ADR-006: FHIR Facade Endpoints

## Status

Accepted

## Context

OpenGRADE needs to comply with FHIR standards for interoperability with other health IT systems. However, the internal REST API is optimized for the web application (flat DTOs, custom response formats), not FHIR bundles.

We had two options:

1. **Make the internal API FHIR-native** - Every endpoint returns FHIR resources, losing ergonomic request/response formats for web clients
2. **Separate FHIR endpoints** - Keep internal API ergonomic, add a projection layer that serves FHIR on separate endpoints

Option 2 allows us to serve both audiences cleanly.

## Decision

We created a **read-only FHIR projection layer** on top of the internal API. FHIR endpoints:

- Mount under `/fhir/*` path
- Return FHIR R5 resources and bundles
- Support standard FHIR parameters (\_count, \_offset, \_sort, \_elements)
- Include FHIR-compliant headers (ETag, Last-Modified, Content-Type: application/fhir+json)
- Are read-only (no POST/PUT to FHIR endpoints initially)

### URL Structure

```
Internal API:          /api/guidelines/:id
FHIR Facade:           /fhir/Composition/:id

Internal API:          /api/guidelines/:id/recommendations
FHIR Facade:           /fhir/PlanDefinition?related-context=:compositionId

Internal API:          /api/organizations/:id
FHIR Facade:           /fhir/Organization/:id
```

### Example Responses

**Internal API Response:**
```json
{
  "id": "guid-123",
  "title": "Hypertension Management",
  "organizationId": "org-456",
  "status": "PUBLISHED",
  "createdAt": "2024-03-16T14:22:00Z"
}
```

**FHIR Facade Response:**
```json
{
  "resourceType": "Composition",
  "id": "guid-123",
  "meta": {
    "versionId": "2",
    "lastUpdated": "2024-03-16T14:22:00Z",
    "profile": ["http://hl7.org/fhir/StructureDefinition/Composition"]
  },
  "status": "final",
  "type": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "81222-2",
        "display": "Clinical guidelines"
      }
    ]
  },
  "title": "Hypertension Management",
  "subject": {
    "reference": "Organization/org-456"
  },
  "date": "2024-03-16T14:22:00Z",
  "section": [
    {
      "title": "Recommendations",
      "entry": [
        {
          "reference": "PlanDefinition/rec-789"
        }
      ]
    }
  ]
}
```

### FHIR Projection Service

Each module includes a FHIR projection service that converts database entities to FHIR resources:

```typescript
// In guidelines.fhir.service.ts
@Injectable()
export class GuidelinesFhirService {
  constructor(private prisma: PrismaService) {}

  async getComposition(guidelineId: string): Promise<IComposition> {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: guidelineId },
      include: { sections: true, organization: true },
    });

    return {
      resourceType: 'Composition',
      id: guideline.id,
      meta: {
        versionId: String(guideline.version),
        lastUpdated: guideline.updatedAt.toISOString(),
        profile: [
          'http://hl7.org/fhir/StructureDefinition/CPGComputableGuideline',
        ],
      },
      status: this.mapStatus(guideline.status),
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '81222-2',
            display: 'Clinical guidelines',
          },
        ],
      },
      title: guideline.title,
      subject: {
        reference: `Organization/${guideline.organizationId}`,
      },
      date: guideline.publishedAt?.toISOString() || guideline.updatedAt.toISOString(),
      section: guideline.sections.map(s => this.mapSection(s)),
    };
  }

  private mapSection(section: Section): ICompositionSection {
    return {
      title: section.title,
      entry: section.recommendations.map(r => ({
        reference: `PlanDefinition/${r.id}`,
      })),
    };
  }
}
```

### FHIR Controller

```typescript
@Controller('fhir')
export class FhirController {
  constructor(private fhirService: GuidelinesFhirService) {}

  @Get('Composition/:id')
  async getComposition(@Param('id') id: string, @Res() res: Response) {
    const resource = await this.fhirService.getComposition(id);

    res.set('Content-Type', 'application/fhir+json');
    res.set('ETag', `W/"${resource.meta.versionId}"`);
    res.set('Last-Modified', resource.meta.lastUpdated);

    return res.json(resource);
  }

  @Get('Composition')
  async searchCompositions(
    @Query('_count') count: number = 10,
    @Query('_offset') offset: number = 0,
  ) {
    const resources = await this.fhirService.searchCompositions(count, offset);
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: resources.total,
      entry: resources.data.map(r => ({
        resource: r,
      })),
    };
  }
}
```

## Consequences

### Positive

1. **Standards Compliance** - Systems can integrate via FHIR without learning OpenGRADE's internal API
2. **Separation of Concerns** - Internal API and FHIR endpoints evolve independently
3. **Read-Only Initially** - Simpler to implement than bidirectional FHIR sync
4. **ETag Support** - Clients can use ETags for caching and conditional requests
5. **FHIR Search** - Standard FHIR search parameters (\_count, \_sort, etc.)
6. **Interoperability** - Can integrate with FHIR-native systems (SMART on FHIR apps, etc.)

### Negative

1. **Maintenance Burden** - Two APIs to maintain and keep in sync
2. **Data Duplication** - FHIR responses contain redundant data (embedded vs. reference)
3. **Projection Overhead** - Converting to FHIR adds CPU and latency
4. **Limited Write Support** - No POST/PUT to FHIR endpoints (only reads)
5. **Test Coverage** - FHIR endpoints need separate test suite
6. **Schema Coupling** - FHIR projection is coupled to database schema

## Implementation Patterns

### Implement a Projection Service

For each module, create a `.fhir.service.ts` file:

```typescript
// guidelines.fhir.service.ts
@Injectable()
export class GuidelinesFhirService {
  async getComposition(id: string): Promise<IComposition> { ... }
  async searchCompositions(limit: number, offset: number): Promise<...> { ... }
}
```

### Handle FHIR Parameters

```typescript
@Get('Composition')
async searchCompositions(
  @Query('_count') count?: number,
  @Query('_offset') offset?: number,
  @Query('_sort') sort?: string,
) {
  const results = await this.fhirService.searchCompositions({
    limit: count || 10,
    offset: offset || 0,
    sort: sort || 'date:desc',
  });

  return this.buildSearchBundle(results);
}
```

### Return FHIR Headers

```typescript
const resource = await this.fhirService.get(id);

res.set('Content-Type', 'application/fhir+json');
res.set('ETag', `W/"${resource.meta.versionId}"`);
res.set('Last-Modified', resource.meta.lastUpdated);
res.set('Cache-Control', 'public, max-age=3600');

return res.json(resource);
```

## Related ADRs

- [ADR-001: FHIR-Native Schema](./001-fhir-native-schema.md) - How database is structured for FHIR
- [ADR-002: NestJS Module Boundaries](./002-nestjs-module-boundaries.md) - How projection services fit in module architecture

## Further Reading

- [FHIR RESTful API](https://www.hl7.org/fhir/R5/http.html)
- [FHIR Search](https://www.hl7.org/fhir/R5/search.html)
- [FHIR Composition](https://www.hl7.org/fhir/R5/composition.html)
- [HL7 Implementer Agreement](https://www.hl7.org/fhir/R5/overview-dev.html)
