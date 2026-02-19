Her er den samlede **Product Requirements Document (PRD)** for Glød.

Denne fil er struktureret, så du kan gemme den som `PRD.md` og fodre den direkte til en AI-udvikler (Claude Code / GitHub Copilot / Codex). Den indeholder al strategisk kontekst, design-regler og tekniske specifikationer i ét dokument.

---

# Product Requirements Document (PRD): Glød

**Version:** 1.0
**Status:** Greenfield / Ready for Dev
**Strategisk Partner:** Dansk Sexologisk Akademi (DKSA)
**Mission:** At skabe en tilladelsesstruktur for nysgerrige sjæle gennem "Event-First" arkitektur og fællesskab.

---

## 1. Executive Summary

Glød er en PWA (Progressive Web App), der kombinerer billetsalg til fysiske events med et digitalt fællesskab. Vi løser "Cold Start" problemet ved at digitalisere eksisterende fællesskaber (startende med DKSA) i stedet for at bygge en dating-pool fra bunden.

**Kernefilosofi:**

1. **Event-Først:** Mødet sker i virkeligheden før det sker digitalt.
2. **Witnessing:** Vi bruger social vouching frem for algoritmer.
3. **Privacy:** "Vi ved du er rigtig (MitID), men vi ved ikke hvem du er (ZKP)".

---

## 2. Tech Stack & Infrastruktur

Vi bygger "Lean & Self-Hosted" for maksimal performance, privacy og lave omkostninger.

### Core Stack

* **Runtime:** `Bun` (Performance & DX).
* **Backend Framework:** `Hono` (Letvægts API & WebSockets).
* **Frontend:** `React` via `Vite` + `TypeScript`.
* **Styling:** `Tailwind CSS` + `shadcn/ui`.
* **Database:** `PostgreSQL` (Self-hosted).
* **Storage:** `RustFS` (S3-kompatibel object storage).

### Infrastruktur (DevOps)

* **Host:** `Hetzner Cloud` (CPX server).
* **Orchestration:** `Coolify` (Docker management).
* **Reverse Proxy:** `Traefik` (Automatisk SSL via Coolify).
* **Domains:**
* `findgloed.dk` (Primary / API / System emails).
* `findglød.dk` (Marketing / Redirect).



### Eksterne Services

* **Auth (Identity):** `Idura` (MitID OIDC integration).
* **Email:** `Resend` (Transactional).
* **Betaling:** `Stripe` (Checkout Sessions).

---

## 3. Design System: "Nordic Noir Wellness"

**Målgruppe:** Kvinder & De Nysgerrige (Vanilla-Curious).
**Vibe:** Eksklusiv cocktailbar i Berlin, ikke et diskotek i provinsen. Sofistikeret, mørk, varm.

### Tailwind Config Directive

* **Backgrounds:** `bg-neutral-950` (Warm Black). Undgå ren sort (#000000).
* **Accents:** `orange-500` (Copper/Amber) & `rose-900` (Deep Red) for subtile highlights.
* **Text:** `text-neutral-200` (Off-white) for læsbarhed uden at skære i øjnene.
* **Typography:**
* *Headings:* Serif (e.g., Playfair Display) eller Elegant Sans.
* *Body:* Sans-serif (Inter/Geist) for høj læsbarhed.



### The "Smoked Glass" Component

Alle kort, modaler og flydende elementer skal bruge denne stil for at skabe dybde og mystik:

```css
.glass-panel {
  @apply bg-neutral-950/70 backdrop-blur-md border border-white/5 shadow-2xl;
}

```

### UI Rules

* **Rounded:** `rounded-2xl` eller `rounded-3xl` på alt. Ingen skarpe kanter.
* **Blur-by-Default:** Brugerbilleder og sensitivt indhold er sløret (`blur-xl`), indtil brugeren interagerer.
* **Motion:** Langsomme, lækre transitioner (`duration-500` eller `700`). Ingen hurtige "lyn".

---

## 4. Fase 1: The Waitlist (Landing Page)

**Mål:** Leadgenerering via DKSA-partnerskabet.

### User Journey: "The Curious Lead" (Sofie)

1. **Ankomst:** Sofie lander på `findglød.dk`. Hun ser "Nordic Noir" æstetikken og "I samarbejde med Dansk Sexologisk Akademi" badget. Hun føler sig tryg.
2. **Action:** Hun scroller ned ("Sticky Smoked Glass" header følger med). Hun indtaster email.
3. **System:**
* Backend validerer email.
* Gemmer i `leads` tabel.
* Trigger `Resend` API -> "Velkomstmail".


4. **Feedback:** Formen erstattes af en rolig succes-besked: "Tak Sofie. Du er nr. 423 i køen."

### Datamodel (Postgres)

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

```

---

## 5. Fase 2: MVP – The Event Portal

**Mål:** Sælge billetter til DKSA-events og validere MitID-flowet.

### User Journey: "The Ticket Buyer" (Jonas)

1. **Entry:** Jonas klikker på et link til "DKSA Sommer-intro".
2. **Gatekeeping:** Han trykker "Køb Billet". En `glass-panel` modal popper op: "Verificering påkrævet".
3. **Auth:** Han sendes til Idura (MitID). Systemet bekræfter 18+ og gemmer en hash (ingen CPR).
4. **Onboarding:** Han vælger et Alias ("Jay").
5. **Køb:** Han betaler 150 kr via Stripe.
6. **Reward:** Han sendes retur til eventsiden. Knappen er nu "Vis Billet" (QR). Deltagerlisten "Se hvem der kommer" låses op (men er blurred).

### Features

* **Event List:** Fetch fra DB. Visning med store cover-billeder.
* **Ticket System:** Stripe Webhook integration. Generering af unik QR-hash.
* **Gæsteliste:** Privacy-first. Kun synlig for billetkøbere.

### Datamodel Updates

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mitid_hash TEXT UNIQUE NOT NULL, -- ZKP princip
  alias TEXT,
  role TEXT DEFAULT 'user' -- 'admin', 'partner'
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  price_dkk INT NOT NULL,
  location TEXT,
  image_url TEXT -- RustFS
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  status TEXT DEFAULT 'valid',
  qr_hash TEXT UNIQUE
);

```

---

## 6. Fase 3: PWA – Community

**Mål:** Fastholde brugere mellem events via witnessing og chat.

### User Journey: "The Vouch" (Jay & Luna)

1. **Context:** Eventet er slut. Jay sidder i toget.
2. **Action:** Han åbner appen, går til "Tidligere Events". Finder Lunas profil (blurred).
3. **Interaction:** Han trykker "Unblur" (langsom transition). Trykker "Giv Kudos".
4. **Logic:** Systemet tjekker `tickets` tabellen: Begge var til stede -> Vouch tilladt.
5. **Match:** Luna har allerede vouchet for Jay. Chat-ikonet tændes (orange glød).
6. **Connect:** De chatter i real-time (E2EE).

### Features

* **Vouching:** Kudos-tags ("God samtalepartner", "Respektfuld").
* **Spicer Model:** Interesse-inventory med wellness-sprog (Ja/Nej/Måske). Matching viser kun fælles Ja/Måske.
* **Chat:** WebSockets i Hono. Gatekeeping: Kun åben ved match/vouch.

### Datamodel Updates

```sql
CREATE TABLE vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  tags TEXT[]
);

CREATE TABLE interests (
  user_id UUID REFERENCES users(id),
  interest_id TEXT, -- e.g. 'shibari_begynder'
  status TEXT -- 'yes', 'maybe', 'no'
);

```

---

## 7. Implementerings-instrukser

1. **Database:** Kør migrationer via SQL scripts i `/backend/migrations`.
2. **API:** Brug Hono til alle endpoints. Hold logikken ude af controllers (Service Pattern).
3. **Frontend:** Brug `shadcn/ui` som base, men overskriv styling med "Smoked Glass" utilities defineret i Design Systemet.
4. **Deployment:** Dockerfile skal bygge både frontend og backend i ét image, der serveres af Bun. Deploy til Coolify.