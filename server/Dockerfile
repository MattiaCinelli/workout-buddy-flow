# Debian-based (not alpine): better-sqlite3 is a native addon, and prebuilt
# binaries are far more reliably available for glibc than for musl across
# the architectures self-hosters actually use (amd64 VPS, arm64 Raspberry
# Pi). This trades a larger base image for "npm install just works" on the
# platforms this is meant to run on.

FROM node:22-slim AS build
WORKDIR /app

# Present only as a fallback: better-sqlite3 first tries a prebuilt binary
# for the target platform/arch, and only falls back to compiling from
# source (needing these) if none matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/workout-buddy.sqlite

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# /app/data is created here (not left for the app to mkdir at runtime) so
# its ownership is set before the volume takes it over — Docker copies an
# image directory's existing content, including ownership, into a named
# volume the first time it's mounted over that path.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 3000
VOLUME ["/app/data"]

# No curl/wget in the slim image — Node 22 has fetch() built in, so this
# needs no extra package.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
