FROM oven/bun:1.3.8-alpine
WORKDIR /app

# Vi installerer deps i imaget for at have et udgangspunkt, men bind-mountet
# fra værten kan have nyere afhængigheder. Derfor kører vi 'bun install'
# i CMD også — Bun's resolver er hurtig nok til at det er en no-op hvis
# alt allerede er installeret.
COPY package.json bun.lock ./
RUN bun install

EXPOSE 4563
CMD ["sh", "-c", "bun install && bun run dev"]
