# Glod (Gloed) — Complete Design Brief for Google Stitch

> This document contains everything needed to generate high-fidelity mockups for all pages of the Glod platform. Use these exact colors, fonts, spacing values, and interaction patterns. Every design must feel like a warm, sophisticated Nordic cocktail lounge — never clinical, never aggressive, never cheap.

---

## 1. Project Overview

**Glod** (Danish: "Gloed", meaning "ember" or "glow") is an event-first PWA for curious souls — a platform built in partnership with the Danish Academy of Sexology (DKSA). It serves "The Missing Middle": the approximately 39% of the Danish population who are curious about exploring intimacy, desire, and relational development, but feel unsafe or unwelcome on existing platforms.

Glod is **not** a dating app. It is an **event portal** where verified members discover curated in-person events (workshops, social gatherings, retreats), purchase tickets, attend physically, and only then unlock social features like viewing other attendees and messaging. The core philosophy is: **real-world connection first, digital connection second.**

The platform has three roles:
- **Members** — the vanilla-curious middle. Primarily women and curious men seeking a safe entry point.
- **Organizers** — create and manage events. Can invite experienced facilitators from the community.
- **Admins** — oversee the platform, approve organizers, handle moderation.

**Core philosophy:** Safety through verification (MitID/AltID age verification), privacy through blur-by-default, trust through physical-first interaction, and sophistication through Nordic Noir Wellness aesthetics.

---

## 2. Design System

### 2.1 Color Palette

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--accent` | `#BF4646` | 191, 70, 70 | Primary action buttons, logo, CTAs. A warm terracotta/copper that signals passion in a mature, safe way. |
| `--surface-sec` | `#EDDCC6` | 237, 220, 198 | Secondary surfaces, card backgrounds in light mode. A warm sand tone that feels human and calms the nervous system. |
| `--background-base` | `#FFF4EA` | 255, 244, 234 | Marketing pages, landing page, onboarding. A warm cream ("Soft Sand") that maximizes trust on external-facing pages. |
| `--background-app` | `neutral-950` (Tailwind) | ~10, 10, 10 | App surfaces (logged-in state). A warm black ("Nordic Noir") that creates an exclusive cocktail-bar atmosphere. |
| `--interactive` | `#7EACB5` | 126, 172, 181 | Links, focus rings, interactive elements, borders. A deep teal that signals order and reliability. |

**Supplementary colors (for states):**
| Purpose | Color | Usage |
|---|---|---|
| Success / Approved | Warm green (pulsing glow) | QR scan approved, form success |
| Warning / Already used | Warm yellow/amber | Duplicate QR scan, soft warnings |
| Error / Invalid | Warm red | Invalid QR, form errors, destructive actions |
| Text on dark | `white` / `white/70` / `white/40` | Primary / secondary / muted text on dark app surfaces |
| Text on light | `neutral-950` / `neutral-700` | Primary / secondary text on light marketing surfaces |

**Critical rule:** Never use pure neon colors, saturated blue, or high-contrast black-and-red combinations. All colors must feel warm, muted, and skin-toned — inspired by sunsets and human skin.

### 2.2 Typography

| Role | Font Family | Weight | Usage |
|---|---|---|---|
| Display / Headings (`--font-display`) | **Playfair Display** (Serif) | 400, 600, 700 | Page titles, section headers, event names. Signals editorial authority and adult sophistication. |
| Body / UI (`--font-body`) | **Inter** or **Geist** (Sans-serif) | 400, 500, 600 | Body text, labels, buttons, form fields. Ensures critical information about consent and rules is legible and transparent. |

**Type scale (suggested):**
| Element | Size | Weight | Font |
|---|---|---|---|
| Page title (H1) | 32px / 2rem | 700 | Playfair Display |
| Section title (H2) | 24px / 1.5rem | 600 | Playfair Display |
| Subsection (H3) | 20px / 1.25rem | 600 | Playfair Display |
| Body text | 16px / 1rem | 400 | Inter |
| Small / caption | 14px / 0.875rem | 400 | Inter |
| Kicker / label | 12px / 0.75rem | 500, uppercase, tracking-wide | Inter |
| Button text | 16px / 1rem | 500 | Inter |

### 2.3 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-xl` | `24px` (`rounded-3xl`) | Cards, buttons, modals, input fields. No sharp corners anywhere — everything must feel friendly and inviting to touch. |
| `--radius-lg` | `16px` (`rounded-2xl`) | Smaller cards, badges, chips |
| `--radius-full` | `9999px` (`rounded-full`) | Avatars, circular icons, pills |

### 2.4 Spacing

Based on a **4px grid** for mathematical harmony and visual calm:
| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

Standard page padding: 16px on mobile, 24px on tablet, 32px+ on desktop.

### 2.5 Glassmorphism Specifications

Glassmorphism is used as a **psychological tool** to balance transparency and privacy — the "frosted window" effect suggests something exciting behind the glass without exposing it.

#### `.glass-panel` (Standard container — cards, modals, headers)
- Background: `rgba(10, 10, 10, 0.70)` (neutral-950 at 70% opacity)
- Backdrop filter: `blur(12px)` (`backdrop-blur-md`)
- Border: `1px solid rgba(255, 255, 255, 0.05)` — a very thin edge that catches light
- Box shadow: `shadow-2xl` (0 25px 50px -12px rgba(0,0,0,0.25))
- Border radius: 24px

#### `.glass-stage` (Deep immersion — large sections, backgrounds requiring maximum discretion)
- Background: `rgba(10, 10, 10, 0.80)` (neutral-950 at 80% opacity)
- Backdrop filter: `blur(40px)` — heavy blur making background details impossible to read
- Border: top and bottom `1px solid rgba(255, 255, 255, 0.10)`

### 2.6 Shadows and Depth

| Level | CSS | Usage |
|---|---|---|
| Subtle | `shadow-md` | Resting cards |
| Elevated | `shadow-xl` | Hovered cards, active elements |
| Floating | `shadow-2xl` | Modals, overlays, glass panels |

### 2.7 Component Catalog

Available UI components to use in designs:
- **Button**: `default` (accent fill), `outline`, `ghost`, `destructive`, `disabled/loading`
- **Card**: Glass panel with rounded-3xl corners
- **Badge / Pill**: Status indicators, tags
- **Input**, **Label**, **Textarea**: Rounded-3xl, warm styling
- **Checkbox**, **Select**: Consistent with design system
- **Alert**: `info` (teal), `success` (green), `error` (red)
- **Dialog** (modal), **Sheet** (bottom drawer on mobile)
- **Tabs**, **Table**, **Toast**, **Skeleton** (loading state)

---

## 3. Design Principles

### 3.1 Nordic Noir Wellness

The aesthetic is a blend of a **stylish Nordic design hotel** and an **intimate Berlin cocktail lounge**. Warm, sophisticated, safe. Think: dimmed lighting, smoked glass, terracotta surfaces, quiet jazz. Never clinical, never raw, never loud.

### 3.2 Core Principles

1. **Safe above all.** Every pixel must communicate trustworthiness. The vanilla-curious middle is easily scared away. Nothing in the default view should feel transgressive.
2. **Sophisticated, never overwhelming.** Scandinavian minimalism. Muted, warm colors. Less is more. White space is a feature.
3. **Intentional friction.** Slow transitions (500-700ms), deliberate reveals, no rapid swiping. The platform rewards presence, not speed.
4. **Discreet sensuality.** The design hints, it never shouts. Warmth and glow, not explicit imagery. Subtle radial gradients, breathing animations, ember-like accents.
5. **Privacy by default.** User photos are blurred by default. Anonymity is protected. The interface communicates: "You are safe here."
6. **Invitation, not provocation.** The tone is always welcoming. "Curiosity" not "boundary-pushing". "Connection" not "performance". "Intimacy" not "sexual techniques".

### 3.3 What the Design Must NEVER Be

- **Fetish aesthetic**: No black-and-red color schemes, no leather textures, no BDSM visual language
- **Clinical / medical**: No sterile whites, no hospital-like UI, no cold blues
- **Aggressive / loud**: No neon colors, no urgent animations, no pressure tactics, no countdown timers
- **Cheap / unserious**: No playful cartoon illustrations, no winking emojis, no "spicy" visual language
- **Spiritually alternative**: No mandalas, no chakra imagery, no excessive "energy" language
- **Dating-app generic**: No swipe interfaces, no heart-rain animations, no gamification mechanics
- **Explicit**: No nudity, no suggestive photography, no provocative imagery in default states

---

## 4. Target Audience

### 4.1 Persona 1: Anders & Mette (Primary target — Core business)

**The well-functioning couple with a hidden longing.**

- Age: 32-38. Established relationship, often with small children. Highly educated, stable jobs.
- They have achieved all the classic life goals, but feel a gradual loss of intensity and intimacy. Not in conflict — just flat.
- **Mette** is the primary driver. **Anders** is open but needs safety and legitimacy.
- High willingness to pay, low risk tolerance. They need the platform to feel so safe and sophisticated that they can say: "This is actually quite normal."
- **Design signal:** The interface must feel like something a respected Danish lifestyle magazine would feature. Clean, warm, adult, curated.

### 4.2 Persona 2: Maria (Entry persona — Driver)

**The self-aware woman without full partner buy-in.**

- Age: 30-40. In a long-term relationship, possibly with children. Reflective, curious, growth-oriented.
- More consciously aware of her longing than Mette. More actively searching. Less willing to ignore dissatisfaction.
- Often explores alone first, then potentially involves her partner later.
- Pain point: feeling ahead of her partner in development. Loneliness in her growth.
- **Design signal:** The interface must validate her journey as an individual. Solo sign-up and solo event attendance must feel natural, not awkward.

### 4.3 Persona 3: Line & Kasper (Future target — Growth)

**The curious but ambivalent young couple.**

- Age: 25-33. Early relationship, often without children. Open but inexperienced and impressionable.
- Not in crisis — driven by modern narratives about openness and "the good relationship." Fear of stagnation and missing out.
- Barrier: overwhelmed by possibilities, low experience, fear of losing themselves.
- Lower willingness to pay now, but higher openness. Long-term brand relationship potential.
- **Design signal:** The interface must never overwhelm. Progressive disclosure. Start simple, reveal depth gradually.

### 4.4 Cross-Persona Communication Rules

**Words the design and copy should evoke:** Playful (not perverse), curiosity, connection, intimacy, safe exploration, finding each other again, language for desire, presence, growing together.

**Words the design and copy must avoid:** Kink, dominance/submission, boundary-pushing, naughty/dirty/wild, lose control, tantra/energy, sex-positive (too politicized).

---

## 5. Pages to Design

### MEMBER FLOW

---

#### 5.1 Sign Up / Create Profile

- **Purpose:** First-time registration. Collect minimal information to create an account.
- **User role:** New visitor (not yet a member)
- **Elements:**
  - Email and password fields (rounded-3xl inputs)
  - "Create account" button (accent `#BF4646`, rounded-3xl, full-width on mobile)
  - Option to sign up as individual or as a couple
  - Link to log in (for returning users)
  - Brief reassuring text: "Your privacy is our priority. We never share your data."
  - Glod logo at top
  - Background: `#FFF4EA` (warm cream — this is a public-facing page)
- **Design considerations:**
  - Minimal fields. Only ask for what is absolutely necessary. Additional profile info comes later.
  - The page must feel effortless and calm. No walls of text.
  - Typography: Playfair Display for the heading ("Create your account"), Inter for everything else.
  - Subtle warm gradient or soft texture in the background.

---

#### 5.2 Age Verification (MitID / AltID)

- **Purpose:** One-time identity verification to confirm the user is 18+. No CPR number or full name is stored — only a hash.
- **User role:** Newly registered member (not yet verified)
- **Elements:**
  - Clear explanation of **why** verification is needed (safety, trust, legal requirement) — written in warm, reassuring language
  - "Verify with MitID" button (or AltID when available)
  - Visual trust signals: lock icon, "We only verify your age — we never see or store your identity"
  - Progress indicator showing where in the onboarding flow the user is
  - Background: `#FFF4EA` (still public-facing onboarding)
- **Design considerations:**
  - This is the highest-anxiety moment in the entire flow. The design must maximize calm and trust.
  - Use the `.glass-panel` style for the verification card to signal security and exclusivity.
  - Include a small ZKP (zero-knowledge proof) explainer: "We know you're real. We don't know who you are."
  - After successful verification: warm success state with a subtle glow animation and text: "You're verified."

---

#### 5.3 Profile Page (Edit Own)

- **Purpose:** Member views and edits their own profile — alias, photo, bio, interests, privacy settings.
- **User role:** Verified member
- **Elements:**
  - Profile photo (circular, `rounded-full`, with option to upload or remove)
  - Alias / display name field
  - Short bio textarea
  - Interest tags (selectable pills/badges, `rounded-2xl`, using wellness-language: e.g., "sensory play", "connection", "curiosity")
  - Verification badge (ZKP badge — a small warm ember/spark icon next to the alias, signaling: "verified but anonymous")
  - Toggle: "Show my profile to event attendees" (privacy control)
  - Save button (accent `#BF4646`)
  - Background: `neutral-950` (dark app surface — user is now logged in)
- **Design considerations:**
  - Profile photo has a soft warm border or glow when present. Placeholder is a subtle abstract shape, not a generic silhouette.
  - Interest pills use `--surface-sec` (`#EDDCC6`) as background with dark text, or teal (`#7EACB5`) outline when selected.
  - The page must communicate: "Share only what you're comfortable with. You can always add more later."
  - Glass-panel card containing the profile form, floating on the dark background.

---

#### 5.4 Event Overview (Browse, Filter)

- **Purpose:** Browse upcoming events. Filter by city, date, and event type. This is the primary screen members see after logging in.
- **User role:** Verified member
- **Elements:**
  - Search bar at top (rounded-3xl, subtle glass styling)
  - Filter chips: City (Copenhagen, Aarhus, Odense, Sommersted), Date range, Event type (workshop, social, retreat, work weekend)
  - Event cards in a vertical scrollable list (mobile) or grid (desktop):
    - Each card: `.glass-panel` with event image (subtle warm overlay), event title (Playfair Display), date, city, price, available spots count
    - Rounded-3xl corners
    - Subtle hover: card lifts slightly (`shadow-xl`), warm glow appears at edges
  - Empty state: warm illustration + "No events in your city yet — but they're coming."
  - Background: `neutral-950`
- **Design considerations:**
  - This is the most-visited page. It must feel alive but not overwhelming. 3-5 visible cards maximum before scrolling on mobile.
  - Event images should have a warm color overlay (semi-transparent `#BF4646` or `#EDDCC6`) to maintain brand consistency regardless of source photography.
  - Active filter chips: teal (`#7EACB5`) fill with white text. Inactive: glass-panel style with white/40 text.

---

#### 5.5 Event Detail Page

- **Purpose:** Full details about a specific event. This is where the member decides to buy a ticket.
- **User role:** Verified member
- **Elements:**
  - Hero image at top (with warm gradient overlay fading to dark at bottom)
  - Event title (Playfair Display, large)
  - Kicker text above title: event type label (e.g., "WORKSHOP" or "SOCIAL EVENING")
  - Date, time, city, venue name (no exact address until ticket purchased)
  - Price and available spots remaining
  - Detailed description (what to expect, who it's for, what's included)
  - Facilitator info (if applicable): small avatar + name + short bio
  - "Get Ticket" CTA button (accent `#BF4646`, full-width, rounded-3xl, prominent)
  - "Share event" (subtle ghost button)
  - Background: `neutral-950` with event image bleeding through `.glass-stage` layer
- **Design considerations:**
  - The description must be written in warm, inviting language that reassures the vanilla-curious. The design should leave ample space for text so it doesn't feel cramped.
  - Before ticket purchase: venue shown as city only (e.g., "Copenhagen"). Exact address revealed on the confirmation page.
  - Available spots shown as a warm progress bar (not an aggressive countdown).
  - If sold out: "Sold out — join the waitlist" with a waitlist button replacing the CTA.

---

#### 5.6 Ticket / Payment (Stripe Checkout)

- **Purpose:** Secure payment for an event ticket via Stripe.
- **User role:** Verified member purchasing a ticket
- **Elements:**
  - Order summary card (`.glass-panel`): event name, date, price, any fees
  - Stripe payment element (card input, Apple Pay, Google Pay)
  - Terms and conditions checkbox: "I accept the event guidelines and community rules"
  - "Pay [amount] DKK" button (accent `#BF4646`, full-width)
  - Security badges / reassuring text: "Secure payment via Stripe. We never see your card details."
  - Background: `neutral-950`
- **Design considerations:**
  - Minimal distractions. This page has one job: complete the purchase.
  - The Stripe elements should be styled to match the warm, dark aesthetic as much as Stripe allows.
  - Loading state during payment processing: subtle ember/glow animation (not a spinner).

---

#### 5.7 Confirmation Page with QR Code

- **Purpose:** Confirm successful ticket purchase. Display the digital ticket with QR code for event check-in.
- **User role:** Member who just purchased a ticket
- **Elements:**
  - Success message: "You're in." (Playfair Display, warm)
  - Digital ticket card designed as a physical, valuable object:
    - `.glass-panel` with extra polish — subtle background texture/pattern
    - Event name, date, time
    - Venue with full address (now revealed)
    - QR code (dimmed/muted by default to save battery and protect privacy — tapping it reveals at full brightness)
    - Glod logo subtly integrated
    - Member alias
  - Practical info: what to bring, dress code (if any), arrival time
  - "Add to calendar" button (ghost style)
  - "You'll also receive a confirmation email."
  - Background: `neutral-950`
- **Design considerations:**
  - The ticket must feel **precious and exclusive** — like a beautifully designed invitation card, not a cinema ticket.
  - QR code starts slightly dimmed (`opacity-60`). Tapping the ticket area reveals QR at full opacity with a slow warm glow animation (700ms).
  - Consider a subtle emboss or grain texture on the ticket card.

---

#### 5.8 "Unlocked" Dashboard (After First Event Attendance)

- **Purpose:** After physically attending their first event (checked in via QR), the member unlocks additional social features. This page communicates what's new.
- **User role:** Member who has been checked in at an event
- **Elements:**
  - Celebratory but understated message: "Welcome to the community." (Playfair Display)
  - Explanation of what's now available:
    - "See who was at the event" (link to attendee list)
    - "Send a message to someone you connected with"
    - "Browse upcoming events with richer attendee previews"
  - Subtle warm animation: a gentle ember glow that expands and fades — the "glod" igniting
  - Navigation to the newly available sections
  - Background: `neutral-950` with ambient breathing gradient behind glass
- **Design considerations:**
  - This is a milestone moment. It should feel rewarding but not gamified. No confetti, no badges, no points.
  - The "glow" animation is key: a warm radial gradient (copper/orange) that slowly pulses once, like blowing on an ember. Use `--ease-glod`: `cubic-bezier(0.4, 0, 0.2, 1)` over 700ms.
  - Tone: "You showed up in person. That matters. Here's what opens up."

---

#### 5.9 Event Attendee List

- **Purpose:** View profiles of other people who attended the same event. Only accessible after the event has started and the member has been checked in.
- **User role:** Unlocked member (attended at least one event)
- **Elements:**
  - Event name as header context (e.g., "People from: Summer Evening, Copenhagen")
  - Grid or list of attendee cards:
    - Profile photo: **blurred by default** (`blur-xl` / ~24px CSS blur). The photo is visible as a warm, abstract shape but no details are recognizable.
    - Alias name
    - 1-2 shared interest tags (if any match)
    - Verification badge (ZKP ember icon)
    - "View profile" tap area (tapping initiates the Witnessing Reveal — see Section 6)
  - Empty state: "No one else has shared their profile for this event."
  - Background: `neutral-950`
- **Design considerations:**
  - **Blur-by-default is non-negotiable.** All profile photos start blurred. This protects anonymity and prevents "pic collecting."
  - The blurred photos should still feel warm and human — not like censorship. The blur combined with warm undertones should create an intriguing, "frosted glass" effect.
  - The "Connect" button on each card only becomes active after the event's start time, forcing real-world interaction first.

---

#### 5.10 View Another Person's Profile

- **Purpose:** View another member's full profile after choosing to "witness" them (unblur).
- **User role:** Unlocked member viewing another attendee's profile
- **Elements:**
  - Profile photo: starts blurred, then unblurs with the Witnessing Reveal animation (700ms, `--ease-glod`)
  - Alias and verification badge
  - Bio text
  - Interest tags
  - Event history: which events they've attended (shown as subtle badges, not a detailed list)
  - "Send message" button (teal `#7EACB5` outline or accent `#BF4646` fill)
  - "Block" and "Report" options (subtle, in a menu — not prominent)
  - Background: `neutral-950`
- **Design considerations:**
  - The unblur animation is the platform's most important interaction. It must feel like a **conscious act of acknowledgment**, not a quick judgment. Slow (700ms), smooth, irreversible per session.
  - Profile layout should be generous with whitespace. No cramming of information. Let each element breathe.
  - The profile card uses `.glass-panel` styling, floating on the dark background.

---

#### 5.11 Messaging / Chat

- **Purpose:** Private one-on-one messaging between members who have attended the same event.
- **User role:** Unlocked member
- **Elements:**
  - Conversation list (left panel on desktop, full screen on mobile):
    - Each row: blurred avatar (or unblurred if already viewed), alias, last message preview, timestamp
    - Unread indicator: small warm ember dot (not a number badge)
  - Chat view:
    - Message bubbles: sent messages in accent `#BF4646` with white text, received messages in `.glass-panel` style with white text
    - Text input at bottom (rounded-3xl, glass styling)
    - Send button (accent color)
    - Typing indicator: three gently pulsing dots
  - Background: `neutral-950`
- **Design considerations:**
  - The chat must feel intimate and warm, like passing notes — not like a customer service chat.
  - No read receipts visible by default (privacy). Optional in settings.
  - Message bubbles have generous padding and rounded-3xl corners.
  - Blocked or reported users: conversation disappears with no trace (for safety).

---

#### 5.12 Settings / Privacy

- **Purpose:** Account settings, privacy controls, notification preferences, subscription management.
- **User role:** Any authenticated member
- **Elements:**
  - Sections (use tabs or accordion):
    - **Profile visibility:** Toggle who can see your profile (event attendees only / all verified members)
    - **Photo privacy:** Blur level control for your own photo in attendee lists
    - **Notifications:** Email and push notification preferences
    - **Blocked users:** List with option to unblock
    - **Subscription:** Current plan, payment method (managed via Stripe), cancel option
    - **Account:** Change email, change password, delete account
    - **About:** Terms of service, privacy policy, community guidelines
  - Background: `neutral-950`
- **Design considerations:**
  - Clean, scannable layout. Group related settings logically.
  - Destructive actions (delete account, cancel subscription) use the destructive button style (muted red, requires confirmation dialog).
  - Privacy controls should feel empowering, not scary. Use positive framing: "You control who sees you."

---

### ORGANIZER FLOW

---

#### 5.13 Create Event

- **Purpose:** Organizer creates a new event with all relevant details.
- **User role:** Approved organizer
- **Elements:**
  - Multi-step form or long-scroll form with clear sections:
    1. **Basics:** Event title, event type (dropdown: workshop, social evening, retreat, work weekend), description (rich text)
    2. **When & Where:** Date, start time, end time, city, venue name, address
    3. **Capacity & Price:** Max attendees, ticket price (DKK), waitlist toggle (on/off)
    4. **Facilitator:** Search/invite a facilitator (optional) — search by name, sends invitation
    5. **Preview:** See how the event will look to members
  - "Publish event" button (accent `#BF4646`)
  - "Save as draft" button (ghost style)
  - Background: `neutral-950`
- **Design considerations:**
  - The form must not feel long or overwhelming. Use generous spacing, clear section headers (Playfair Display), and progress indication.
  - The preview step is important — it lets the organizer see exactly what members will see. Show the event detail page in a device frame mockup or card preview.
  - Description field should have placeholder text with examples of warm, inviting language.

---

#### 5.14 Manage Sign-ups / Attendee List / Waitlist

- **Purpose:** Organizer views and manages who has signed up for their event.
- **User role:** Approved organizer
- **Elements:**
  - Tabs: "Confirmed" / "Waitlist" / "Cancelled"
  - Table or list view:
    - Each row: member alias, sign-up date, payment status (paid/pending/refunded), check-in status (not arrived / checked in)
    - Action buttons: move to waitlist, refund, remove
  - Summary stats at top: total confirmed, total waitlisted, spots remaining, revenue
  - "Send message to all attendees" button
  - "Export list" option (subtle)
  - Background: `neutral-950`
- **Design considerations:**
  - This is a management/admin view, but it should still feel on-brand. Use `.glass-panel` cards for the stats summary. Use the standard table component with warm styling.
  - No member photos shown to organizers at this stage (privacy).

---

#### 5.15 Check-in at Event (QR Scanning)

- **Purpose:** At the physical event entrance, the organizer scans attendees' QR codes to check them in.
- **User role:** Organizer (or designated door person)
- **Elements:**
  - Large camera viewfinder (full-screen on mobile, centered on desktop)
  - Scan states with immediate full-screen visual feedback:
    - **APPROVED (green):** The entire screen or border pulses with a warm, glowing green. Member alias shown briefly. "Welcome, [alias]."
    - **ALREADY USED (amber):** Amber/yellow glow. "This ticket has already been scanned."
    - **INVALID (red):** Red glow with clear help text. "This ticket is not valid for this event."
  - Manual search fallback: search by alias if QR fails
  - Running count: "23 of 40 checked in"
  - Background: `neutral-950` with the viewfinder area being the camera feed
- **Design considerations:**
  - The scan states must be instantly recognizable — even from a distance or in dim lighting. The color feedback should be bold and unmistakable (this is one exception to the "muted colors" rule — functional clarity overrides aesthetic restraint).
  - The transition between states uses `--ease-glod` over 500ms.
  - The app should work offline or with poor connectivity (common at event venues).

---

#### 5.16 Invite Facilitator

- **Purpose:** Organizer invites an experienced facilitator to help run their event.
- **User role:** Approved organizer
- **Elements:**
  - Search field: search by facilitator name or alias
  - Results list: facilitator cards with alias, short bio, number of events facilitated
  - "Invite" button on each card
  - Pending invitations list with status (sent / accepted / declined)
  - Background: `neutral-950`
- **Design considerations:**
  - Simple and functional. Facilitators are not a separate role on the platform — they are experienced community members invited by organizers. The UI should reflect this casual but respectful dynamic.

---

### ADMIN FLOW

---

#### 5.17 Admin Dashboard

- **Purpose:** High-level overview of platform health and activity.
- **User role:** Platform administrator
- **Elements:**
  - Summary cards (`.glass-panel`):
    - Total members (with trend arrow)
    - Total verified members
    - Upcoming events count
    - Total revenue this month
  - Recent activity feed: new sign-ups, new events published, new organizer applications
  - Quick action buttons: "Approve organizers", "View events", "View members"
  - Background: `neutral-950`
- **Design considerations:**
  - Clean dashboard layout. Stats cards in a 2x2 grid on mobile, 4-column row on desktop.
  - Use the teal (`#7EACB5`) for trend indicators and data visualizations.
  - This is an internal tool — it can be slightly more utilitarian than member-facing pages, but should still respect the design system.

---

#### 5.18 Approve Organizers

- **Purpose:** Admin reviews and approves applications from people who want to become organizers.
- **User role:** Platform administrator
- **Elements:**
  - Queue of pending applications:
    - Each card: applicant alias, date applied, brief application text / motivation
    - "Approve" button (success green)
    - "Reject" button (destructive, with required reason field)
    - "View full application" expandable section
  - Approved organizers list with option to revoke
  - Background: `neutral-950`
- **Design considerations:**
  - Approval is a gatekeeping function — the design should make it easy to review quickly but hard to approve accidentally (require confirmation).

---

#### 5.19 Overview of Events and Members

- **Purpose:** Admin can browse all events and all members on the platform for moderation and oversight.
- **User role:** Platform administrator
- **Elements:**
  - Tabs: "Events" / "Members"
  - **Events tab:**
    - Filterable table: event name, organizer, date, city, status (draft/live/completed/cancelled), attendee count, revenue
    - Click to view full event detail
    - Actions: cancel event, contact organizer
  - **Members tab:**
    - Filterable table: alias, sign-up date, verification status, events attended count, last active
    - Click to view member detail
    - Actions: suspend, ban, send message
  - Search and filter bar at top
  - Background: `neutral-950`
- **Design considerations:**
  - Efficient data display. The table component should be well-styled with warm alternating row colors (not harsh zebra striping — use very subtle `white/3` and `white/5` alternation on the dark background).

---

## 6. Key Interactions

### 6.1 The Witnessing Reveal (Unblur)

This is the platform's signature interaction, designed to counter "swipe fatigue" and transform quick judgment into conscious acknowledgment.

- **Initial state:** Profile photos in attendee lists have `blur(24px)` applied. The image is a warm, abstract shape — recognizable as a person but with no identifiable details.
- **Trigger:** Member taps "View profile" on an attendee card.
- **Animation:** The blur dissolves from `blur(24px)` to `blur(0)` over **700ms** using the easing curve `cubic-bezier(0.4, 0, 0.2, 1)`. The image simultaneously gains a subtle warm glow at its edges during the transition.
- **Reduced motion:** For users with `prefers-reduced-motion`, replace the unblur with a simple 300ms `opacity` fade-in.
- **Purpose:** Slowing this moment forces the viewer to be intentional. It's not a swipe — it's a choice to see someone.

### 6.2 Glassmorphism Hover / Tap States

- **Cards (event cards, profile cards):** On hover (desktop) or tap (mobile), the card lifts slightly (`translateY(-2px)`), shadow deepens from `shadow-xl` to `shadow-2xl`, and a subtle warm glow appears at the card edges. Transition: 300ms, `--ease-glod`.
- **Buttons:** Primary buttons (`#BF4646`) glow from within on hover — a warm radial gradient expands briefly behind the button, like blowing on an ember. Duration: 300ms.
- **Links:** Teal (`#7EACB5`) links get a subtle underline fade-in on hover.

### 6.3 Glow Feedback (Ambient Breathing)

- Subtle glowing gradients (copper/orange, very low opacity: 5-10%) move slowly behind `.glass-panel` elements. This creates the feeling that the interface is alive — like embers smoldering behind frosted glass.
- The breathing animation cycles over 8-12 seconds. It should be barely noticeable consciously but contribute to the overall warmth subconsciously.
- Implementation: CSS `@keyframes` animating a radial gradient's position and size behind glass layers.

### 6.4 Event Check-in Flow

1. Organizer opens the check-in scanner page.
2. Camera activates showing a viewfinder.
3. Attendee presents their QR code (which they reveal by tapping their ticket).
4. Scan result appears instantly with full-screen color feedback (green/amber/red).
5. Result auto-dismisses after 3 seconds, returning to the viewfinder for the next scan.
6. Each successful scan increments the check-in counter.

### 6.5 Unlock Flow After Event

1. Organizer scans the member's QR code at the event.
2. The system records the member as "physically attended."
3. Next time the member opens the app, they see the "Unlocked" dashboard (Section 5.8).
4. The ember glow animation plays once.
5. New navigation items appear (attendee list, messaging) with a subtle "new" indicator (a tiny ember dot, not a number badge).

### 6.6 QR Code Reveal on Ticket

- The QR code on the ticket page starts at 60% opacity with a slight warm tint overlay.
- Tapping the ticket card reveals the QR at full opacity and brightness over 500ms with a subtle scale animation (100% to 102% and back).
- Purpose: saves battery (OLED screens), protects privacy in public, and creates a small ritual at the door.

---

## 7. Mobile First (PWA)

**Glod is a Progressive Web App (PWA).** It is installed on the user's home screen and runs in a full-screen browser context. There is no native app.

### Mandatory requirements:

1. **Every page must be designed mobile-first (375px width).** Desktop (1280px+) is a secondary layout that adapts the mobile design with more horizontal space, multi-column layouts, and larger type.
2. **Touch targets:** Minimum 44x44px for all interactive elements. Buttons should be generous — 48px height minimum.
3. **Bottom navigation bar:** Primary navigation on mobile lives at the bottom of the screen (thumb-friendly). Items: Home (events), My Tickets, Messages, Profile. The bar uses `.glass-panel` styling.
4. **No hover-dependent interactions.** Everything that works on hover must also work on tap. Hover states are progressive enhancements for desktop.
5. **Safe areas:** Respect iOS safe areas (notch, home indicator). Content must not be hidden behind system UI.
6. **Performance:** Glass effects and blur must degrade gracefully on low-end devices. Provide fallbacks (solid dark backgrounds) when `backdrop-filter` is not supported.
7. **Offline state:** Display a warm, branded offline message ("You're offline. We'll be here when you're back.") rather than a browser error page.

### Responsive breakpoints:

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | 375px - 767px | Single column, bottom nav, full-width cards |
| Tablet | 768px - 1023px | Two-column grid for cards, bottom nav or side nav |
| Desktop | 1024px+ | Multi-column, side navigation, wider content area, more whitespace |

---

## Appendix: Quick Reference Card

For fast lookup when designing any screen:

| Property | Value |
|---|---|
| Primary accent | `#BF4646` |
| Secondary surface | `#EDDCC6` |
| Background (marketing) | `#FFF4EA` |
| Background (app) | `neutral-950` (~`#0A0A0A`) |
| Interactive / links | `#7EACB5` |
| Display font | Playfair Display |
| Body font | Inter |
| Border radius (default) | 24px |
| Spacing grid | 4px base |
| Glass panel bg | `rgba(10,10,10,0.70)` + `backdrop-blur(12px)` + `1px solid rgba(255,255,255,0.05)` |
| Glass stage bg | `rgba(10,10,10,0.80)` + `backdrop-blur(40px)` + `1px solid rgba(255,255,255,0.10)` |
| Animation easing | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Reveal duration | 700ms |
| Standard transition | 500ms |
| Minimum touch target | 44x44px |
| Mobile-first width | 375px |
