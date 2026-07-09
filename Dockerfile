# syntax=docker/dockerfile:1.7
# ----------------------------------------------------------------------
# lingolevel-ai: multi-stage Docker build
# Stage 1 — install deps and build the frontend bundle
# Stage 2 — production runtime with only what's needed
# ----------------------------------------------------------------------

ARG NODE_VERSION=20

# ---------- Stage 1: builder ----------
FROM node:${NODE_VERSION}-bookworm-slim AS builder

WORKDIR /app

# Install OS deps needed by esbuild / node-gyp (kept minimal).
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Copy manifests first to leverage Docker layer cache.
COPY package.json package-lock.json ./

# Install full deps (including dev deps for the build).
RUN npm ci --no-audit --no-fund

# Copy the rest of the source.
COPY . .

# Build the production bundle: frontend assets + bundled server.
# `npm run build` (from package.json) runs:
#   - vite build  → dist/{index.html,assets/*}
#   - esbuild server.ts → dist/server.cjs
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

WORKDIR /app

# Run as a non-root user for least-privilege.
RUN groupadd --system --gid 1001 lingolevel \
 && useradd  --system --uid 1001 --gid lingolevel lingolevel \
 && mkdir -p /app/dist \
 && chown -R lingolevel:lingolevel /app

# Install only production deps in the runtime image.
COPY --chown=lingolevel:lingolevel package.json package-lock.json ./
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# Copy the build output from the builder stage.
COPY --from=builder --chown=lingolevel:lingolevel /app/dist ./dist

# Ensure the server enters production mode (serves static dist/, no Vite dev middleware).
ENV NODE_ENV=production

# Drop privileges.
USER lingolevel

# Document the port. The actual value is read from $PORT at runtime
# (defaults to 59100 — see server.ts and .env.example).
EXPOSE 59100

# Lightweight liveness check using the server-config echo endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||59100)+'/api/server-config',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

# Run as a node process so signals (SIGTERM) are handled correctly.
CMD ["node", "dist/server.cjs"]
