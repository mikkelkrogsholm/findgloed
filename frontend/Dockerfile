FROM oven/bun:1.3.8-alpine
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts vitest.config.ts tailwind.config.ts postcss.config.js ./
RUN bun install
COPY index.html ./index.html
COPY privacy.html ./privacy.html
COPY design.html ./design.html
COPY waitlist ./waitlist
COPY src ./src
EXPOSE 5173
CMD ["bun", "run", "dev"]
