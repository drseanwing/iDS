# OpenGRADE

> Open-source, FHIR-native clinical guideline authoring platform implementing the GRADE methodology.

## Overview

OpenGRADE is a living guideline platform for creating, managing, and publishing clinical practice guidelines using the GRADE (Grading of Recommendations Assessment, Development and Evaluation) methodology. It produces FHIR R5-conformant resources and supports the full guideline lifecycle.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TailwindCSS + shadcn/ui |
| Backend | NestJS 11 (TypeScript) |
| Database | PostgreSQL 16 + Prisma ORM |
| Identity | Keycloak 24 (OIDC) |
| File Storage | S3-compatible (MinIO for dev) |
| API | REST (OpenAPI 3.1) + FHIR R5 facade |

## Project Structure

```
├── apps/
│   ├── api/          # NestJS backend (22 modules)
│   ├── web/          # React frontend (4 pages, 23 authoring components, 53 hooks)
│   └── e2e/          # Playwright E2E tests (65 tests)
├── packages/
│   ├── fhir/         # Shared FHIR type definitions
│   └── ui/           # Shared UI utilities
├── infra/            # Docker Compose & infrastructure
└── tasks/            # Detailed phase task specifications (6 phases)
```

## Current Status

The platform is in active development. Major features implemented:

- Full guideline authoring workflow (sections, recommendations, references, PICOs)
- GRADE evidence assessment (5 downgrade + 3 upgrade factors, certainty levels)
- Evidence-to-Decision framework (4/7/12-factor modes)
- Versioning and publishing (major/minor, immutable snapshots, version comparison)
- Collaboration tools (comments, COI declarations, polls/voting, tasks, milestones)
- FHIR R5 facade (Composition, PlanDefinition, Evidence, Citation, Bundle)
- Export (PDF, DOCX, JSON)
- RBAC with Keycloak OIDC integration
- Decision aid generation with pictograph visualization

See [implementation-task-list.md](./implementation-task-list.md) for detailed status of every feature.

## Quick Start

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/drseanwing/iDS.git
   cd iDS
   ```

2. Copy environment files:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. Start infrastructure services:
   ```bash
   cd infra
   docker compose up -d
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the API server:
   ```bash
   cd apps/api
   npm run start:dev
   ```

6. Start the web frontend:
   ```bash
   cd apps/web
   npm run dev
   ```

### API Documentation

Once the API is running, visit [http://localhost:3000/api/docs](http://localhost:3000/api/docs) for the Swagger/OpenAPI documentation.

## Architecture

See [opengrade-architecture.md](./opengrade-architecture.md) for the full architecture specification.

See [implementation-task-list.md](./implementation-task-list.md) for the implementation roadmap.

## License

TBD
