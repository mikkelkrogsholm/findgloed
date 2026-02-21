# CORE_TOKENS.md

## 1. Formål
Dette dokument definerer de absolutte fundamenter i Gløds designsprog. Formålet er at sikre, at visuelle ændringer kan styres ét sted og slå igennem globalt via `tokens.css`.

## 2. Farvepalette (Aktiv MVP)
Vi bruger farver, der findes i huden og solnedgangen for at skabe intuitiv tryghed og undgå det kliniske.

| Token Navn | Værdi | Anvendelse | Antropologisk Begrundelse |
| :--- | :--- | :--- | :--- |
| `--accent` | `#BF4646` | Primær handling / Logo | En varm terracotta/kobber, der signalerer lidenskab på en moden og tryg måde. |
| `--surface-sec` | `#EDDCC6` | Sekundære flader | En varm sandfarve, der føles menneskelig og dæmper nervesystemet. |
| `--background-base`| `#FFF4EA` | Marketing / Landing | En varm creme ("Soft Sand"), der skaber maksimal tillid på eksterne sider. |
| `--background-app` | `neutral-950`| App-flader | En varm sort ("Nordic Noir"), der skaber en eksklusiv cocktailbar-vibe. |
| `--interactive` | `#7EACB5` | Links / Fokus | En dyb teal, der skaber balance og signalerer "orden i sagerne". |

## 3. Typografi
Vi bruger skrifttyper til at signalere en kurateret stemme og redaktionel autoritet.

* **Display/Headings (`--font-display`)**: En moderne **Serif** (f.eks. Playfair Display). Det sender et signal om, at her er der voksne mennesker, der har tænkt over tingene.
* **Body/Sans (`--font-body`)**: En ren **Sans-serif** (f.eks. Inter eller Geist). Sikrer, at kritisk information om samtykke og regler er letlæselig og gennemsigtig.

## 4. Radius og Spacing
* **`--radius-xl`**: `rounded-3xl` (ca. 24px). Ingen skarpe kanter; alt skal føles venligt at røre ved for at sænke paraderne.
* **Spacing system**: Baseret på en 4px grid for at sikre matematisk harmoni og visuel ro.

## 5. Strategisk kobling
Disse tokens er valgt for at navigere i **Jantelovens dobbeltbinding**. Ved at bruge sofistikerede, dæmpede farver frem for aggressiv neonrød, tillader vi brugeren at udforske uden at føle, at de bryder den sociale kode om beskedenhed.