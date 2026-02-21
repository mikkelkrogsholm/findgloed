# SURFACES_AND_GLASS.md

## 1. Formål
Dette dokument definerer Gløds "Berlin Cocktailbar" æstetik gennem brugen af dybde, lagdeling og sløring. Formålet er at skabe et visuelt miljø, der føles både eksklusivt og privat, hvilket understøtter behovet for diskretion i sex-positive rum.

## 2. Principper for Glassmorphism
Vi benytter glasmorphism ikke blot som en trend, men som et psykologisk værktøj til at balancere gennemsigtighed og privatliv.

* **Det "Duggede Vindue":** Bruger `background-blur` til at antyde, at der foregår noget spændende "inde bagved", uden at det er blottet eller råt.
* **Diskretion via Slør:** Sløret fungerer som en beskyttelse for brugeren, hvilket får interfacet til at føles sofistikeret og beskyttet frem for koldt og afslørende.
* **Lag-på-lag:** Ved at lægge gennemsigtige paneler over varme, glødende baggrunde skabes en dybde, der føles som et varmt, fysisk rum.

## 3. Tekniske Primitives (`primitives.css`)
Alle flader i appen skal benytte disse semantiske klasser frem for ad hoc styling.

### .glass-panel (Standard container)
Bruges til kort, modaler og headers for at skabe definition og dybde.
* **Baggrund:** `bg-neutral-950/70` (Warm Black med 70% gennemsigtighed).
* **Effekt:** `backdrop-blur-md` (giver en moderat sløring af baggrunden).
* **Kant:** `border border-white/5` (en meget tynd kant, der fanger lyset og definerer panelet).
* **Skygge:** `shadow-2xl` for at løfte panelet fra basen.

### .glass-stage (Deep immersion)
Bruges til store sektioner eller baggrunde, hvor maksimal diskretion er påkrævet.
* **Baggrund:** `bg-neutral-950/80`.
* **Effekt:** `backdrop-blur-[40px]` (en kraftig sløring, der gør bagvedliggende detaljer umulige at tyde).
* **Kant:** `border-y border-white/10`.

## 4. Blur-by-Default (Privacy Pattern)
Som en del af vores "Privacy-first" strategi er visse elementer sløret som standard.
* **Brugerbilleder:** Billeder af andre deltagere i f.eks. gæstelister starter med `blur-xl`.
* **Formål:** Dette beskytter brugernes anonymitet og sikrer, at de kun ses af dem, de har en reel interaktion med.

## 5. Strategisk kobling
Denne arkitektur løser **Privacy-Safety Paradoxet**. Ved at bruge "Smoked Glass" (mørkt, sløret glas) kan vi tilbyde en platform, der føles sikker og verificeret (via MitID), men som samtidig beskytter mod social eksponering og "pic collectors".