# MOTION_AND_INTERACTION.md

## 1. Formål
Dette dokument definerer bevægelsessproget i Glød. Animationer i Glød må aldrig være hurtige, "hårde" eller føles som gamification. Bevægelse skal i stedet følge kroppens naturlige rytme og understøtte ritualet omkring "Witnessing" (at blive set i dybden).

## 2. Animation Tokens (`tokens.css`)
Vi benytter specifikke kurver og varigheder for at sikre en flydende og "elektrisk" følelse.

* **`--ease-glød`**: `cubic-bezier(0.4, 0, 0.2, 1)`. En organisk kurve, der starter og slutter blødt.
* **`--duration-sensual`**: `700ms`. Bruges til alle væsentlige afsløringer af indhold og profil-interaktioner.
* **`--duration-slow`**: `500ms`. Standard varighed for side-skift og modaler.

## 3. Interaktions-ritualer
Interaktioner er designet som "digitale ritualer", der kræver nærvær frem for hurtige swipes.

### The Witnessing Reveal (Unblur)
Dette er platformens vigtigste animation, der modvirker "swipe-fatigue".
* **Initial State**: Billeder af andre brugere er som udgangspunkt sløret med `blur-xl`.
* **Action**: Når en bruger klikker for at se et menneske, fjernes sløringen gradvist over `700ms` via `--ease-glød`.
* **Formål**: At transformere handlingen fra en hurtig dom (validering) til en bevidst anerkendelse af et andet menneske (witnessing).

### Glow-Feedback
For at understøtte navnet "Glød" skal interfacet føles levende.
* **Breathe Animation**: Subtile lysende gradients bevæger sig langsomt bag de gennemsigtige glas-lag (`.glass-panel`).
* **Active State**: Når en knap aktiveres, skal den "lyse op" indefra med en varm radial gradient (kobber/orange), som om man puster til en glød.

## 4. Implementering
* **Værktøjer**: Vi benytter `Framer Motion` til komplekse transitioner (unblur, page transitions) og `tailwindcss-animate` til simple element-indgange.
* **Motion-policy**: Animationer skal respektere systemets indstillinger for "Reduced Motion". I disse tilfælde erstattes unblur-animationen af en simpel fade-in.

## 5. Strategisk kobling
Dette bevægelsesdesign er en direkte løsning på **"Performance-fælden"**. Ved at indføre strategisk friktion og langsomme afsløringer devaluerer vi det overfladiske "swipe" og belønner i stedet den bevidste intention om at skabe forbindelse.