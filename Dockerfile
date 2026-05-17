# syntax=docker/dockerfile:1.7

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# better-sqlite3 ships a prebuilt binary for most arches, but if the platform
# is something prebuilds doesn't cover, npm falls back to node-gyp which needs
# python3 + a C++ toolchain. Install them up-front so cross-arch builds via
# buildx + QEMU don't surprise us.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json tsconfig.build.json vite.config.ts ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build

# Drop dev deps for the runtime stage. Native modules stay compiled.
RUN npm prune --omit=dev

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app

# eudev provides udevadm, which @serialport/bindings-cpp shells out to on
# Linux for USB serial-port enumeration. Without it /api/coordinators/ports
# returns 500 ENOENT (spawn udevadm).
RUN apk add --no-cache eudev \
  && addgroup -S zighub \
  && adduser -S -G zighub -h /app zighub \
  && mkdir -p /data \
  && chown -R zighub:zighub /data /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8282 \
    ZIGHUB_DB_PATH=/data/zighub.db

COPY --from=build --chown=zighub:zighub /app/dist ./dist
COPY --from=build --chown=zighub:zighub /app/node_modules ./node_modules
COPY --from=build --chown=zighub:zighub /app/package.json ./package.json

USER zighub
EXPOSE 8282
VOLUME ["/data"]

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8282)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Run migrations then start the server. exec replaces the shell so signals
# (SIGTERM from `docker stop`) reach the Node process.
CMD ["sh", "-c", "node dist/db/migrate-cli.js && exec node dist/index.js"]
