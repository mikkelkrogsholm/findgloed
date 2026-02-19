FROM oven/bun:1.3.8-alpine
WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
RUN bun install
COPY src ./src
COPY tests ./tests
COPY migrations ./migrations
EXPOSE 3000
CMD ["sh", "-c", "bun run src/migrate.ts && bun run src/index.ts"]
