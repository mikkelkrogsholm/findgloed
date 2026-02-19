# Findgloed - Phase 1 (Landing + Waitlist)

## Stack
- Backend: Bun + Hono + PostgreSQL
- Frontend: React + Vite + Tailwind
- Local runtime: Docker Compose (Apple Silicon M3 / arm64)

## Ports (GLOD profile)
- Web: `4563`
- API: `4564`
- Postgres: `4565`

## Run locally
```bash
docker compose up --build
```

Web:
- `http://localhost:4563`

API:
- `http://localhost:4564/api/health`
- `POST http://localhost:4564/api/waitlist`

## TDD test run (Docker)
```bash
docker compose run --build --rm api bun test
```

## Notes
- API runs migration at container start (`backend/migrations/001_init.sql`).
- If secrets contain `$`, escape as `$$` in `.env` to avoid Docker Compose interpolation warnings.
