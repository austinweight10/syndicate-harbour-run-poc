# Build from repo root (fly.toml lives at repo root).
# Needs docs/fixtures + london-runner-demo/london-weather.json for pipeline:demo.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY shopify-app/package.json shopify-app/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY --from=deps /app/node_modules ./node_modules
COPY shopify-app/ ./
COPY docs/fixtures /docs/fixtures
COPY london-runner-demo/london-weather.json /london-runner-demo/london-weather.json
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    SCOPES=read_orders,read_products,read_customers,write_products \
    DATABASE_URL=file:/data/dev.db \
    PORT=8080 \
    HOST=0.0.0.0 \
    AGENTS_HEADED=0 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data /ms-playwright

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/app ./app
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json
# Source scripts (tsx) resolve ../../../docs/fixtures from app/fixtures → /docs/fixtures.
# Bundled server resolves from build/server/assets → /app/docs/fixtures.
COPY --from=build /docs/fixtures /docs/fixtures
COPY --from=build /docs/fixtures /app/docs/fixtures
COPY --from=build /london-runner-demo /london-runner-demo
COPY --from=build /london-runner-demo /app/london-runner-demo
COPY shopify-app/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh \
  && npx prisma generate \
  && npx playwright install --with-deps chromium

EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["/app/docker-entrypoint.sh"]
