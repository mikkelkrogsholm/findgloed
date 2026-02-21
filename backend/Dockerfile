FROM oven/bun:1.3.8-alpine
WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
RUN bun install
COPY src ./src
COPY tests ./tests
COPY migrations ./migrations
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=15s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
ENTRYPOINT ["./entrypoint.sh"]
