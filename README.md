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
│   ├── api/          # NestJS backend
│   └── web/          # React frontend
├── packages/
│   ├── fhir/         # Shared FHIR types
│   └── ui/           # Shared UI components
├── infra/            # Docker Compose & infrastructure
└── docs/             # Architecture & specifications
```

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
