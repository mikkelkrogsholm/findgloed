# FindGlod Design System (MVP)

## Formål
Dette dokument er den praktiske reference for design i MVP.
Målet er, at visuelle ændringer sker ét sted og slår igennem globalt.

## Kilde Til Sandhed
- Design tokens: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/styles/tokens.css`
- Primitive klasser: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/styles/primitives.css`
- CSS entrypoint: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/styles.css`
- UI-komponenter (shadcn custom): `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/components/ui`
- Routes + feature flags: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/config/app-config.ts`
- Design showcase-data: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/config/design-system.ts`
- Design-side: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/src/pages/design-page.tsx`

## Design Playground
- Lokal URL: `http://localhost:4563/design.html`
- Entry-fil: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/design.html`
- Feature flag: `VITE_ENABLE_DESIGN_PAGE=true|false`
- Deploy-anbefaling: `VITE_ENABLE_DESIGN_PAGE=false` i prod.

## Aktiv Palette
- `#BF4646` accent
- `#EDDCC6` secondary surface
- `#FFF4EA` base/background
- `#7EACB5` links/border/focus

## Arkitektur
1. `tokens.css`
- Alle designværdier ligger her: farver, typografi, radius, skygger, blur, overlays.
- Nye visuelle behov skal først modelleres som tokens.

2. `primitives.css`
- Semantiske klasser der forbruger tokens.
- Eksempler: `theme-header`, `glass-stage`, `glass-panel`, `btn-primary`, `input-field`.

3. `components/ui`
- shadcn-baserede komponenter customizes med primitives/tokens.
- Pages må ikke style med ad hoc hardcoded farver.

## V1 Komponentkatalog
- `Button`: `default`, `outline`, `ghost`, `destructive`, `disabled/loading`
- `Card`
- `Badge` (pills/status)
- `Input`, `Label`
- `Textarea`
- `Checkbox`
- `Select`
- `Alert`: `info`, `success`, `error`
- `Dialog`
- `Sheet`
- `Tabs`
- `Table`
- `Toast`
- `Skeleton`

## Domain Patterns I Designside
- Waitlist form: `idle`, `success`, `error`
- Ticket card med QR placeholder
- Scan states: `GODKENDT`, `ALLEREDE BRUGT`, `UGYLDIG`
- Empty state
- Error state

## Regler
- Brug shadcn-komponenter først.
- Undgå hardcoded farver i React-komponenter.
- Undgå hardcoded designværdier i primitives, brug tokens.
- Brug semantiske klasser (`body-text`, `display-text`, `kicker-text`) frem for ad hoc utility-farver.
- Hold token-navne stabile og ændr værdier før struktur.

## Ændringsworkflow
1. Tilføj eller opdater token i `tokens.css`.
2. Opdater primitive klasse i `primitives.css` hvis nødvendigt.
3. Opdater komponent i `components/ui`.
4. Verificer visuelt på `/design.html`.
5. Regressionscheck på landing + privacy.

## Shadcn Setup
- Konfiguration: `/Users/mikkelfreltoftkrogsholm/Projekter/findgloed/frontend/components.json`
- Alias: `@/*` peger til `src/*` via `tsconfig.json` og `vite.config.ts`
