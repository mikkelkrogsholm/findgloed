# Findgloed — Claude Instructions

## Tests

**Alle tests skal altid være grønne.** Ingen PR eller commit må efterlade fejlende tests.

- Kør `bun run test` fra `frontend/` efter ændringer i frontend-kode
- Hvis en komponents indhold ændres, opdatér de tilhørende tests
- Skriv aldrig kode der bevidst bypasser eller sletter tests for at få dem til at passere — fix årsagen

## Arkitektur

Se `.claude/skills/findgloed-app/SKILL.md` for fuld oversigt over routes, komponenter, API-endpoints og services.

## Deployment

Se `.claude/skills/findgloed-infra/SKILL.md` for server, Docker Compose, domæner og deploy-procedure.

Se `docs/deployment.md` for trin-for-trin guide.

## Sprog

Al kode skrives på engelsk. Kommentarer, commit-beskeder og dokumentation skrives på dansk.

## Browser-automation

**Brug altid `agent-browser`** til al browser-interaktion — IKKE Chrome MCP,
Playwright direkte, eller andre browser-værktøjer. Skill ligger i
`.claude/skills/agent-browser/SKILL.md`.

Eksempler på hvornår: visuel verifikation af UI, end-to-end-test af user
journeys, screenshot af sider, multi-bruger-flows (to dummy-brugere der
skriver sammen), formular-udfyldning, klik-test, mobile-viewport-test.

Start altid med at læse den aktuelle workflow:
```sh
agent-browser skills get core
```
før du kører andre `agent-browser`-kommandoer — så instruktionerne matcher
den installerede version.
