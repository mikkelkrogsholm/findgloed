# DOMAIN_PATTERNS.md

## 1. Formål
Dette dokument definerer, hvordan de unikke strategiske funktioner i Glød skal implementeres visuelt. Formålet er at sikre en sammenhængende oplevelse på tværs af billetsalg, par-matching og community-interaktion.

## 2. Ticket & Check-in (MVP Fase 2)
Check-in processen er designet til at minimere friktion og skabe tryghed for både bruger og partner.

* **Billet-kort**: Designes som et fysisk objekt med `.glass-panel` for at signalere værdi og eksklusivitet.
* **QR-kode**: Er som udgangspunkt nedtonet for at spare strøm og beskytte privatlivet, indtil brugeren interagerer med den.
* **Scan States (Admin View)**: Giver øjeblikkelig visuel feedback ved indgangen:
    * **GODKENDT**: Hele skærmen eller kanten gløder i en varm, pulserende grøn farve.
    * **ALLEREDE BRUGT**: Markeres med en gul advarselsfarve.
    * **UGYLDIG**: Markeres med en rød fejlfarve og tydelig hjælpetekst.

## 3. Spicer Model (Par-matching)
Dette mønster tillader par at udforske interesser uden risiko for afvisning.

* **Interface**: Et minimalistisk gitter af interesser formuleret i wellness-sprog (f.eks. "sensorisk leg").
* **Respons-knapper**: Store, bløde `rounded-3xl` knapper til valg af "Ja", "Nej" eller "Måske".
* **Match Reveal**: Når begge parter har svaret "Ja" eller "Måske", tændes en orange "glød-gnist" på aktiviteten som bekræftelse.

## 4. Privacy & Verificering
Vi bruger visuelle signaler til at opbygge tillid uden at kompromittere anonymiteten.

* **ZKP Badge**: En lille diskret "glød-gnist" (ikon) placeret ved brugerens alias. Det signalerer: "Vi ved du er rigtig (MitID), men vi ved ikke hvem du er".
* **Blur-by-default**: Alle brugerbilleder i gæstelister og profiler starter med `blur-xl` for at beskytte mod social eksponering og "pic collectors".

## 5. Event-Først Flow
Matching er sekundært i forhold til den fysiske deltagelse.

* **Deltagerliste**: Kun synlig for brugere, der har købt billet til det specifikke event.
* **Connect-knap**: Bliver først aktiv efter eventets starttidspunkt for at tvinge interaktionen ud i den virkelige verden (Pillar 6).

## 6. Strategisk kobling
Disse mønstre er designet til at løse problemet med "The Missing Middle". Ved at bruge velkendte wellness-æstetikker kombineret med stærk sikkerhed og social accountability (vouching), skaber vi en tryg overgang for de 39% af befolkningen, der er nysgerrige, men utrygge ved eksisterende løsninger.