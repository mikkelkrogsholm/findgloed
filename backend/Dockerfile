FROM oven/bun:1.3.8-alpine
WORKDIR /app

# wget bruges af healthcheck. Det er allerede i busybox/alpine, men vi lader
# det stå eksplicit så imaget er reproducerbart.

COPY package.json bun.lock tsconfig.json ./
RUN bun install
COPY src ./src
COPY tests ./tests
COPY migrations ./migrations
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# Default-port matcher .env (API_PORT=39564). Runtime kan overrride via PORT env.
EXPOSE 39564
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=15s \
  CMD wget -qO- "http://localhost:${PORT:-39564}/api/health" || exit 1
ENTRYPOINT ["./entrypoint.sh"]
