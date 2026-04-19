# syntax=docker/dockerfile:1.7
#
# OpenGRADE Web — multi-stage production image
# Build context: repo root (see .github/workflows/deploy-staging.yml)
#
# Stages:
#   1. build   — install deps, build workspace libs, run vite build
#   2. runtime — nginx:1.27-alpine serving the static SPA bundle

ARG NODE_IMAGE=node:20-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine

# ---------------------------------------------------------------------------
# Stage 1: build — install workspace deps and produce apps/web/dist
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy lockfile + every workspace manifest first so this layer is cached
# whenever manifests don't change.
COPY package.json package-lock.json ./
COPY apps/api/package.json        ./apps/api/package.json
COPY apps/web/package.json        ./apps/web/package.json
COPY apps/e2e/package.json        ./apps/e2e/package.json
COPY packages/fhir/package.json   ./packages/fhir/package.json
COPY packages/ui/package.json     ./packages/ui/package.json
COPY packages/widget/package.json ./packages/widget/package.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

# Copy the source trees the web build needs.
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/fhir ./packages/fhir
COPY packages/ui   ./packages/ui
COPY apps/web      ./apps/web

# Build workspace libs the web app depends on first…
RUN npm -w @opengrade/fhir run build \
 && npm -w @opengrade/ui   run build

# …then build the SPA itself. Output: /app/apps/web/dist
RUN npm -w @opengrade/web run build


# ---------------------------------------------------------------------------
# Stage 2: runtime — static file serving via nginx
# ---------------------------------------------------------------------------
FROM ${NGINX_IMAGE} AS runtime

# Replace the default site config with our SPA-aware one (try_files fallback,
# long-cache for hashed assets, no-cache for index.html, /healthz endpoint).
RUN rm -f /etc/nginx/conf.d/default.conf
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

# Drop the built static bundle into nginx's webroot.
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/healthz || exit 1

# Use nginx's default entrypoint/CMD (foreground) — explicit for clarity.
CMD ["nginx", "-g", "daemon off;"]
