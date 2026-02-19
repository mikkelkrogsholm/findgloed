# AGENTS.md - Findgloed

## Purpose
Project-specific operating rules for AI coding agents working in this repository.

## Product scope (MVP)
- Build only MVP phase 1+2.
- Phase 1: Landing page + waitlist email capture + Resend confirmation.
- Phase 2: Event portal, MitID verification via Idura, Stripe ticket purchase, QR ticket + scan flow.
- Out of scope for MVP: chat, community UI, interests matching.

## Current delivery order
1. Landing + waitlist + Resend
2. Login/Idura + profile alias
3. Events list/detail + Stripe checkout
4. Ticket generation + QR + ticket email
5. Admin/partner scan and guestlist

## Source of truth
- PRD: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/development/PRD.md`
- MVP spec: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/development/MVP-SPEC-v1.1.md`
- If conflicts exist, `MVP-SPEC-v1.1.md` wins for implementation details.

## Approval model
- If the user asks for spec-only mode, do not code before explicit `go`.
- After `go`, implement end-to-end increments (not partial pseudo-work).

## Hard constraints
- Danish language in user-facing copy for MVP.
- Keep implementation minimal and MVP-focused (KISS/DRY/YAGNI/SOLID).
- Do not introduce phase 3 features.
- Local development target is Apple Silicon M3.
- All local development and execution must run in Docker.
- TDD is mandatory for all feature work and bug fixes.

## Local environment rules
- Hardware baseline: Apple Silicon (M3).
- Architecture baseline: `linux/arm64` images by default.
- Keep local setup reproducible with Docker Compose.
- Run app, db, and supporting services via containers.
- Use nonstandard local ports based on GLOD mapping:
  - `4563` app
  - `4564` api
  - `4565` postgres
  - `4566` redis
  - `4567` maildev
  - `4568` adminer

## Environment and secrets
- Keep secrets only in environment variables.
- No hardcoded credentials.
- Use URL-safe secrets (letters, numbers, `_`, `-`) to avoid Docker Compose interpolation issues.
- Keep `.env.example` updated when new runtime settings are added.

## Engineering standards
- TypeScript strict mode for app code.
- Keep business logic in services, not controllers/routes.
- Add tests for changed behavior (at least critical flow coverage).
- Test-first workflow required:
  1. Add/adjust failing test
  2. Implement minimal fix
  3. Refactor safely
- Keep unit/integration tests runnable in Docker.

## UI and design system standards
- Use shadcn-first component strategy.
- Reuse components from `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/components/ui`.
- No hardcoded design values in page/component code.
- Use tokens from `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/styles/tokens.css`.
- Use semantic primitives from `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/styles/primitives.css`.
- Glassmorphism should be transparent with backdrop blur of underlying layers, not opaque color blocks.

## Design playground policy
- Design page entry: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/design.html`
- Local URL: `http://localhost:4563/design.html`
- Route and feature flag config: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/config/app-config.ts`
- Feature flag: `VITE_ENABLE_DESIGN_PAGE`
- Keep design page enabled locally, disabled in production by default.

## Routing baseline
Current active pages:
- `/`
- `/privacy.html`
- `/design.html` (feature-flagged)

MVP target routes:
- `/`, `/events`, `/event/:slug`, `/login`, `/profile`, `/admin/scan`, `/api/health`

## Role model (MVP baseline)
- `user`: own profile and tickets
- `partner`: only own events/tickets/check-ins
- `admin`: full access

## GDPR and privacy requirements
- Data minimization: never store CPR or full legal name from MitID provider.
- Store only required identity reference (`sub`/persistent identifier) and adult verification fields.
- Terms/privacy consent must be timestamped.
- Marketing consent must be separate opt-in and never pre-checked.
- Implement `Delete my profile` as soft-delete + anonymization in MVP.
- Keep financial/ticket-relevant records per retention policy (5 years).

## Security requirements
- TLS in transit.
- Stable, non-leaky error responses.
- Log critical actions with actor + timestamp:
  - profile deletion
  - check-in
  - role changes

## Integrations baseline
- Auth provider: Idura (`https://idura.eu/`)
- Payment: Stripe
- Email: Resend
- Infra: Coolify + Traefik + Hetzner

## Documentation lookup policy
Prefer project skills before ad-hoc web search:
- `findgloed-tech-docs` (router)
- `findgloed-app-docs`
- `findgloed-integrations-docs`
- `findgloed-infra-docs`

Use canonical docs and `llms.txt` sources where available.

## Git and change hygiene
- Use small atomic commits (single purpose per commit).
- Do not mix refactor + feature + formatting in one commit.
- Use branch names prefixed with `codex/`.
- Never use destructive git commands unless explicitly requested.

## Delivery behavior
- Start with clarification/spec when requested.
- After implementation approval, ship testable increments.
- Report blockers immediately with concrete options.
