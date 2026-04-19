# syntax=docker/dockerfile:1.7
#
# OpenGRADE API — multi-stage production image
# Build context: repo root (see .github/workflows/deploy-staging.yml)
#
# Stages:
#   1. deps    — install full workspace deps (cached on lockfile + manifests)
#   2. build   — build @opengrade/fhir, generate Prisma client, build @opengrade/api
#   3. runtime — minimal node:20-alpine image with prod deps + compiled output
#
# Health endpoint: GET /health (Nest sets a global 'api' prefix but explicitly
# excludes 'health' and 'health/(.*)' — see apps/api/src/main.ts).

ARG NODE_IMAGE=node:20-alpine

# ---------------------------------------------------------------------------
# Stage 1: deps — install all workspace dependencies
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

# Tools needed by some native deps (prisma engines, bcrypt, etc.)
RUN apk add --no-cache libc6-compat openssl

# Copy lockfile + every workspace manifest first so this layer is cached
# whenever no manifests change.
COPY package.json package-lock.json ./
COPY apps/api/package.json        ./apps/api/package.json
COPY apps/web/package.json        ./apps/web/package.json
COPY apps/e2e/package.json        ./apps/e2e/package.json
COPY packages/fhir/package.json   ./packages/fhir/package.json
COPY packages/ui/package.json     ./packages/ui/package.json
COPY packages/widget/package.json ./packages/widget/package.json

# Strict, reproducible install honouring the lockfile.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev


# ---------------------------------------------------------------------------
# Stage 2: build — compile workspace package(s) and the API
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app

# Shared TS config + the bits of source we actually need to build the API.
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/fhir ./packages/fhir
COPY packages/ui   ./packages/ui
COPY apps/api      ./apps/api

# 1) Build the workspace lib the API depends on.
RUN npm -w @opengrade/fhir run build

# 2) Generate the Prisma client into node_modules/.prisma + node_modules/@prisma/client.
RUN npm -w @opengrade/api run prisma:generate

# 3) Compile the API itself -> apps/api/dist.
RUN npm -w @opengrade/api run build


# ---------------------------------------------------------------------------
# Stage 3: runtime — slim production image
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

# OpenSSL is required by Prisma's query engine at runtime.
# wget is used by the HEALTHCHECK (already present in alpine, but be explicit).
RUN apk add --no-cache libc6-compat openssl wget tini

ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# Re-install only production deps (still need every workspace manifest so the
# workspace topology resolves correctly).
COPY package.json package-lock.json ./
COPY apps/api/package.json        ./apps/api/package.json
COPY apps/web/package.json        ./apps/web/package.json
COPY apps/e2e/package.json        ./apps/e2e/package.json
COPY packages/fhir/package.json   ./packages/fhir/package.json
COPY packages/ui/package.json     ./packages/ui/package.json
COPY packages/widget/package.json ./packages/widget/package.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspaces --include-workspace-root

# Bring across compiled artifacts and generated Prisma client from build stage.
COPY --from=build /app/packages/fhir/dist          ./packages/fhir/dist
COPY --from=build /app/apps/api/dist               ./apps/api/dist
COPY --from=build /app/apps/api/prisma             ./apps/api/prisma
COPY --from=build /app/node_modules/.prisma        ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma        ./node_modules/@prisma

# `prisma` CLI is in devDependencies and got pruned by --omit=dev, so copy it
# (and its scoped engine deps) explicitly so `npx prisma migrate deploy` works
# in init containers / migration Jobs without a separate image.
COPY --from=build /app/node_modules/prisma         ./node_modules/prisma

# Drop privileges. node:20-alpine ships with a built-in `node` user (uid 1000).
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Liveness probe — health endpoint is excluded from the global 'api' prefix.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Use tini so node receives SIGTERM cleanly under k8s.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main"]
