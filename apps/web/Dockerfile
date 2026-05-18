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

# VITE_ build-time env vars (baked into the SPA bundle)
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=opengrade
ARG VITE_KEYCLOAK_CLIENT_ID=opengrade-web

# ---------------------------------------------------------------------------
# Stage 1: build — install workspace deps and produce apps/web/dist
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Expose VITE_ args to the build stage so Vite bakes them into the bundle
ARG VITE_API_URL
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

RUN apk add --no-cache libc6-compat

# Copy lockfile + every workspace manifest first so this layer is cached
# whenever manifests don't change.
COPY package.json package-lock.json ./
COPY apps/api/package.json        ./apps/api/package.json
COPY apps/web/package.json        ./apps/web/package.json
COPY packages/fhir/package.json   ./packages/fhir/package.json
COPY packages/ui/package.json     ./packages/ui/package.json

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
RUN cd apps/web && npx vite build


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
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

# Use nginx's default entrypoint/CMD (foreground) — explicit for clarity.
CMD ["nginx", "-g", "daemon off;"]
