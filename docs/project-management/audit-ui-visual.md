# Glød — UI/Visuel/A11y Audit

**Dato:** 16. maj 2026
**Auditeret af:** Claude (static analysis af `frontend/src/pages/*.tsx`, `components/**`, `styles/`, `index.html`, `vite.config.ts`)
**Tema-præmis:** Beslutning 1 (voksen sensualitet, ikke wellness/porno), beslutning 9 (sproglige bandlysninger), Nordic Noir-æstetik via tokens + glassmorphism.

---

## Severity-oversigt

- **Kritisk:** 7
- **Høj:** 19
- **Medium:** 21
- **Lav:** 10

**Total:** 57 issues.

---

## Kritisk

### 1. Kort med `onClick` på `<div>`/`<Card>` mangler tastatur- og a11y-rolle
- **Type:** a11y
- **Filer:** `frontend/src/pages/events-page.tsx:151-186`, `members-page.tsx:94-138`, `messages-page.tsx:77-110`, `my-events-page.tsx:74-97`
- **Beskrivelse:** Hele kort er klikbare (`cursor-pointer` + `onClick`), men de er `<Card>`-divs uden `role="button"`, `tabIndex={0}`, `onKeyDown` eller fokus-ring. Tastaturbrugere og screen readers kan ikke aktivere dem.
- **Fix:** Wrap indhold i `<a href>` (gør hele card til link via stretched-link mønster), eller tilføj `role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(...)}` plus `aria-label`. Anbefal `<a>`-tilgang så højreklik/middle-click åbner i ny fane.

### 2. `theme-color` står på `#0c0a09` (kulsort) — siden er warm cream `#f7eee1`
- **Type:** inconsistent / branding
- **Filer:** `frontend/index.html:9`, `frontend/vite.config.ts:32-33`
- **Beskrivelse:** Mobile Safari farver adresse-bjælken sort, mens body baggrund er lys. Status-bar mismatch på iOS, address bar mismatch på Android Chrome. PWA `background_color` og `theme_color` er begge sat til `#0c0a09` — det matcher hverken `legacy`- eller `anthro-v1`-temaet.
- **Fix:** Sæt `theme_color: "#3e312f"` (text-primary) eller `"#b85b43"` (accent) — eller bedst `"#f7eee1"` for lys top-bar. Hvis "Nordic Noir" reelt skal være mørkt, må selve `body`-baggrunden ændres.

### 3. Tone-konsistens: "trygt rum" som mantra brugt 8 steder
- **Type:** tone
- **Filer:** `landing-page.tsx:92` ("Et trygt sted"), `vision-page.tsx:16,110,152`, `membership-page.tsx:115`, `signup-page.tsx:75`, `partner-interest-modal.tsx:32` ("Styrke trygge rammer"), `design-page.tsx:102`
- **Beskrivelse:** Beslutning 9 siger eksplicit: "Trygt" siges én gang i privatlivspolitikken og vises gennem features. Lige nu er det første ord på landing ("Et trygt sted") og gentages tværs af brand-overflader. Wellness-markør.
- **Fix:** Erstat med fact-baserede formuleringer ("MitID-verificeret", "Manuel godkendelse", "Code of conduct pr. event"). Behold "trygt" kun i `privacy-page.tsx`.

### 4. Headings: Landing hopper direkte til `<h2>`, springer `<h1>` over
- **Type:** a11y / SEO
- **Fil:** `frontend/src/pages/landing-page.tsx:91`
- **Beskrivelse:** Forsiden har ingen `<h1>` — hero-overskriften er `<h2>`. SEO-skadeligt og bryder semantisk hierarki for screen readers.
- **Fix:** Gør hero til `<h1>`. Hvis brand-mark "Glød" skal være h1, så lav den til `<h1>` i SiteShell og hero til `<h2>` konsekvent.

### 5. Skeleton-screens findes som komponent men bruges aldrig
- **Type:** missing-state
- **Filer:** `members-page.tsx:39-45`, `events-page.tsx:142-143`, `messages-page.tsx:56-58`, `my-events-page.tsx:66-68`, `profile-page.tsx:144-150`, `verification-page.tsx:55-60`, `onboarding-page.tsx:173-178`, `event-detail-page.tsx:74-80`, `member-detail-page.tsx:100-105`, `membership-page.tsx:100-105`, `admin-page.tsx:258`, `conversation-page.tsx:76-81`
- **Beskrivelse:** Alle loading-states er en `<p>Indlæser…</p>` plaintekst (eller "Henter…"). `Skeleton`-komponenten i `components/ui/skeleton.tsx` bruges udelukkende i `design-page.tsx`. Layoutet hopper grimt når data lander.
- **Fix:** Introducer skelet-grids der efterligner kort-grids i members/events og besked-rækker. Mindst på indlogget-flow.

### 6. Native `window.confirm`/`window.prompt` til kritiske flows (block, rapport, slet event, cancel sub)
- **Type:** a11y / mobile / branding
- **Filer:** `event-thread.tsx:63`, `admin-events-page.tsx:127`, `membership-page.tsx:83`, `member-detail-page.tsx:81,89`
- **Beskrivelse:** Native prompts bryder Nordic Noir-æstetikken totalt, kan ikke styles, er svære på mobile, og giver dårlig UX for "Rapportér" (tager fri-tekst via `window.prompt`).
- **Fix:** Brug eksisterende `Dialog`-komponent (`components/ui/dialog.tsx`) til bekræftelse og en `Textarea` til rapport-grund.

### 7. Klikbare kort animerer `scale` direkte i Tailwind — bypasser `prefers-reduced-motion`
- **Type:** motion / a11y
- **Filer:** `events-page.tsx:153`, `members-page.tsx:96`, `messages-page.tsx:80`, `my-events-page.tsx:77`
- **Beskrivelse:** `transition-transform hover:scale-[1.01]` står direkte i className. `primitives.css`-reglen for `[data-motion="reduced"]` rammer kun `.hover-glow`/`.btn-primary`. Motion-mode bliver ignoreret på kort-hover.
- **Fix:** Erstat med `hover-glow`-klasse fra primitives, eller tilføj en `card-hover` primitive der respekterer `data-motion="reduced"`.

---

## Høj

### 8. Klikbare medlems-/event-kort har ingen fokus-ring
- **Type:** a11y
- **Filer:** `events-page.tsx:151`, `members-page.tsx:96`, `messages-page.tsx:80`, `my-events-page.tsx:77`
- **Fix:** Tilføj `focus-visible:ring-2 focus-visible:ring-[var(--color-link)]` (forudsat at de bliver fokusérbare via fix #1).

### 9. `<img>` har tomt `alt=""` selv når billedet ER indholdet
- **Type:** a11y
- **Filer:** `members-page.tsx:103`, `member-detail-page.tsx:156`, `profile-page.tsx:287`
- **Beskrivelse:** Tom alt er korrekt for dekorative billeder, men disse er profil-/stemningsbilleder der bærer information ("kvinde med ryggen til, halvmørke"). Screen reader-brugere får ingenting.
- **Fix:** Tilføj `alt={photo.kind === "face" ? \`${member.display_name}\` : "Stemningsbillede"}` eller lad brugeren give beskrivelse i upload.

### 10. `bg-black/40` og `bg-black/50` hardcodede
- **Type:** typography / inconsistent
- **Filer:** `members-page.tsx:113`, `profile-page.tsx:291`
- **Beskrivelse:** Bryder token-systemet. Bruger Tailwind-direkte i stedet for `--overlay-scrim`.
- **Fix:** Erstat med `style={{ background: "var(--overlay-scrim)" }}` eller en ny `--photo-caption-bg`-token.

### 11. Side-headers inkonsistente: kicker mangler på 5 sider
- **Type:** inconsistent / typography
- **Filer mangler kicker:** `my-events-page.tsx:58`, `conversation-page.tsx`, `admin-page.tsx:240`, `partner-confirm-page.tsx:90`, `waitlist-confirm-page.tsx:90`, `not-found-page.tsx:10`
- **Beskrivelse:** 13 sider har `noxus-kicker kicker-text` + h1. 6 sider springer kicker over. Skader rytmen.
- **Fix:** Definer en `PageHeader`-komponent med kicker + title + intro og brug overalt.

### 12. Login-kicker: "Kun for administratorer" er forkert
- **Type:** tone / inconsistent
- **Fil:** `login-page.tsx:62`
- **Beskrivelse:** Login bruges nu af alle medlemmer (Fase 1-4 åbnede medlems-flow), men kickeren siger stadig "Kun for administratorer". CardDescription siger også "lead-oversigten og administrere platformen".
- **Fix:** Erstat med "Log ind" + intro "Velkommen tilbage. Log ind for at gå videre."

### 13. Manglende footer på alle sider
- **Type:** missing-feature
- **Filer:** Hele app — kun header i `site-shell.tsx`
- **Beskrivelse:** Ingen footer betyder: ingen vedvarende link til persondatapolitik fra members/events/messages, ingen kontakt-email, ingen handelsbetingelser, ingen "© 2026 Glød". Privacy nås kun fra landing/login.
- **Fix:** Tilføj minimal footer i SiteShell: ©, privatliv, kontakt-email, version. Diskret for indlogget-flow.

### 14. Profil-page: 7 knapper i flad række (Kontoadministration) bryder hierarki
- **Type:** inconsistent / mobile
- **Fil:** `profile-page.tsx:347-368`
- **Beskrivelse:** Pause, verificering, medlemmer, events, beskeder, medlemskab, log ud — alle outline/ghost. Ingen primær handling, ingen gruppering. På 375px wraps de til 4 rækker.
- **Fix:** Gruppér i "Status" (pause, verificering) og "Genveje" (medlemmer/events/…). Log ud får separat destructive-area.

### 15. `Pris (øre)` label i admin er forvirrende
- **Type:** tone / a11y
- **Fil:** `admin-events-page.tsx:321`
- **Beskrivelse:** Backend kalder feltet `price_cents` — 100 cents = 1 kr. Admin label siger "øre". Det er teknisk korrekt (100 øre = 1 kr.) men adminbrugere skal regne i hovedet. "1000" → 10 kr. eller 100 kr.?
- **Fix:** Lav input til kr. med 2 decimaler, og konvertér til cents on submit. Eller mindst "Pris i øre — fx 12500 = 125 kr." som help text.

### 16. Onboarding: `<button>` kort i step 1+2 har ingen fokus-ring
- **Type:** a11y
- **Fil:** `onboarding-page.tsx:211-227, 238-254`
- **Beskrivelse:** Custom button-kort til rolle/face-valg har kun border-color skift. Ingen synlig fokus-indikator når man tab'er.
- **Fix:** Tilføj `focus-visible:ring-2 focus-visible:ring-[var(--color-link)] focus-visible:ring-offset-2`.

### 17. Verification-page mangler progress på samtykke-step
- **Type:** missing-state
- **Fil:** `verification-page.tsx:39-53`
- **Beskrivelse:** Når brugeren submitter samtykke, viser knappen "Gemmer…" — fint — men efter `reload()` får man ikke explicit success-feedback. Bruger antager det virkede.
- **Fix:** Tilføj `Alert variant="success"` der bekræfter "Tak. Vi sender besked når MitID er klart."

### 18. Conversation-page polling hver 8s uden visning af tilstand
- **Type:** missing-state
- **Fil:** `conversation-page.tsx:52-55`
- **Beskrivelse:** Polling hver 8. sekund er aggressivt og giver ingen indikation af "ny besked landet". Ingen optimistic UI for egne beskeder. Beskeder springer ind 0-8s efter modtagelse.
- **Fix:** Optimistisk UI: append egen besked straks. Brug Server-Sent Events eller WebSocket på sigt. Som minimum: visuel indikator når data refresheres.

### 19. Conversation `h-[calc(100dvh-12rem)]` brydes på iOS Safari pga. URL-bar
- **Type:** mobile
- **Fil:** `conversation-page.tsx:99`
- **Beskrivelse:** `100dvh - 12rem` antager en bestemt header-højde. På små mobiler kan input-feltet ende under URL-bar når den dukker op.
- **Fix:** Lås tekstarea + send-knap i bunden med `position: sticky; bottom: 0` og brug `safe-area-inset-bottom` padding.

### 20. Mobile: header-row har ingen plads til language/tema-skifter
- **Type:** mobile / branding
- **Fil:** `site-shell.tsx:85-181`
- **Beskrivelse:** Brand + nav + burger optager hele bredden, men der er ingen dark-mode toggle eller sprog-toggle. Hvis kommer senere skal layout omtænkes nu.
- **Fix:** Reserver plads, eller indfør en "indstillinger"-popover.

### 21. Partner-pill "I samarbejde med DKSA" kun synlig for ikke-loggede
- **Type:** inconsistent
- **Fil:** `site-shell.tsx:236-256`
- **Beskrivelse:** Medlemmer mister legitimerings-ankeret (Sexologisk Akademi). Beslutning 1 siger DKSA er ankeret der gør platformen tør gå længere.
- **Fix:** Lad partner-link forblive synlig — bare diskret (i footer).

### 22. Member detail: Visning af `<img>`-grid uden lightbox/zoom
- **Type:** missing-feature
- **Fil:** `member-detail-page.tsx:152-160`
- **Beskrivelse:** Klik på billede gør intet. Bruger kan ikke se billedet stort, ikke swipe gennem flere.
- **Fix:** Tilføj klik = `Dialog`-modal med stort billede + pile.

### 23. Member detail: "Vis interesse" / "Vis interesse — fjern" på samme knap er forvirrende
- **Type:** inconsistent
- **Fil:** `member-detail-page.tsx:219-228`
- **Beskrivelse:** Toggle-pattern uden tydelig adskillelse. "Interesse sendt — fjern" er svært at parse hurtigt.
- **Fix:** Vis status som badge ("Du har vist interesse") + separat lille "Fjern"-link/knap.

### 24. Photo-upload kategorier i profile-page mangler hjælpe-eksempler
- **Type:** missing-state / UX
- **Fil:** `profile-page.tsx:307-338`
- **Beskrivelse:** "Stemningsbillede" vs "Ansigt (match)" vs "Privat album" er voksen-konceptuelle. En første-gangs bruger har ikke kontekst.
- **Fix:** Tilføj små eksempel-thumbnails eller info-tooltip pr. kategori. Sammenkædning med onboarding-tekst.

### 25. Events-grid `bg-[color:var(--surface-glass)]` som inden-card overflade
- **Type:** inconsistent / glassmorphism
- **Fil:** `events-page.tsx:156`
- **Beskrivelse:** Bruger `--surface-glass` direkte (som ikke er en glas-overflade i token-modellen — den er fyldsfarve). Resten af systemet bruger `.glass-pill`/`.glass-card`.
- **Fix:** Brug en konsekvent `glass-pill` til indre regioner.

### 26. Membership: faktura-tekst `<code>` mangler styling
- **Type:** typography
- **Fil:** `membership-page.tsx:158`
- **Beskrivelse:** `<code>GLOEDDK</code>` får browser-default monospace uden border eller bg. Bryder æstetikken.
- **Fix:** Tilføj global `code`-styling i primitives.css (lille bg, border, monospace, padding).

---

## Medium

### 27. Tom-state for "0 medlemmer" giver ingen CTA
- **Type:** missing-state
- **Fil:** `members-page.tsx:63-71`
- **Beskrivelse:** "Ingen verificerede medlemmer endnu. Kig forbi igen om kort tid." Ingen CTA tilbage til profil eller events.
- **Fix:** Tilføj "I mellemtiden — udforsk events" + knap.

### 28. Tom-state for "0 events" siger "justér filtrene" — selv hvis ingen filtre er sat
- **Type:** missing-state
- **Fil:** `events-page.tsx:144-147`
- **Beskrivelse:** Misvisende: hvis brugeren ikke har filtreret, er "justér filtrene" forvirrende.
- **Fix:** Tjek om filters er tomme; vis kontekst-afhængig besked.

### 29. Tom-state for "0 tilmeldinger" giver ingen CTA tilbage til events
- **Type:** missing-state
- **Fil:** `my-events-page.tsx:68-71`
- **Beskrivelse:** "Du er ikke tilmeldt nogen events endnu." — ingen knap. Brugeren skal selv finde tilbage.
- **Fix:** Tilføj primær CTA "Se kommende events".

### 30. Auto-confirm-page mangler kicker/branding
- **Type:** inconsistent
- **Filer:** `waitlist-confirm-page.tsx`, `partner-confirm-page.tsx`
- **Beskrivelse:** Ingen kicker, ingen Glød-branding udover knapper. Føles afkoblet fra resten.
- **Fix:** Tilføj kicker + samme hero-mønster som vision/privacy.

### 31. NotFoundPage er minimal, ingen branding eller hjælp
- **Type:** inconsistent
- **Fil:** `not-found-page.tsx`
- **Beskrivelse:** "Side ikke fundet" + 1 knap. Mangler kicker, vejledning, kontaktlink. Også typo: "miljo" → "miljø".
- **Fix:** Tilføj kicker "Forkert sti", forklarende tekst, links til vigtigste sider, support-mail.

### 32. Verification-page UI gentager card-kontainer for "ShieldCheck"-info i samtykke-checkbox
- **Type:** inconsistent
- **Fil:** `verification-page.tsx:90-107, 124-135`
- **Beskrivelse:** To ens-stylede paneler (`rounded-2xl border bg-glass`) lige under hinanden. Ser ud som om de er paret men er adskilte funktioner.
- **Fix:** Visuel adskillelse: info-panel mere "informatorisk" tone, samtykke-panel mere "handlings-tone" (fx accent-border).

### 33. Onboarding step-indikator "Trin 1 af 4" er en tekst-kicker, ikke en visuel progress bar
- **Type:** missing-feature
- **Fil:** `onboarding-page.tsx:192-194`
- **Beskrivelse:** Brugere skummer ofte trin uden at læse. En visuel 4-prik progress-bar er hurtigere.
- **Fix:** Render 4 dots med fyldt/tom state.

### 34. Form fejlbeskeder vises som generelle Alert i bunden, ikke pr. felt
- **Type:** a11y / UX
- **Filer:** `signup-page.tsx:148`, `login-page.tsx:144`, `onboarding-page.tsx:339`, mange
- **Beskrivelse:** En enkelt fejl-Alert efter alle felter. Bruger ved ikke hvilket felt der fejlede (specielt onboarding-step-3 hvor multiple felter valideres).
- **Fix:** Brug `aria-invalid` + `aria-describedby` pr. felt og vis fejl ved feltet.

### 35. Inputs uden `autoComplete` på relevante felter
- **Type:** a11y / UX
- **Filer:** `login-page.tsx:78-99` (email + password mangler autoComplete), `onboarding-page.tsx:262-298` (`region`, `bio` ok ingen — men `display_name` kunne være `nickname`)
- **Beskrivelse:** Password-managers fungerer ikke optimalt uden autoComplete.
- **Fix:** `autoComplete="email"` + `autoComplete="current-password"` på login.

### 36. Disabled state på `<Button>` kun visuelt via `opacity-60`
- **Type:** a11y
- **Fil:** `components/ui/button.tsx:8`
- **Beskrivelse:** `opacity-60` på lys baggrund kan stadig være under 4.5:1 kontrast. Kombineret med "Sender…" tekst er det OK, men "Vælg denne plan" disabled (membership) er svær at læse.
- **Fix:** Tjek disabled-kontrast. Overvej en explicit `cursor: not-allowed` + grå baggrund.

### 37. CTA-knapper kalder altid `glow-cta` — selv på destruktive
- **Type:** inconsistent / motion
- **Filer:** `admin-events-page.tsx:148,399`, `member-detail-page.tsx:219`, `verification-page.tsx:147`, `events-page.tsx`, `landing-page.tsx:197`
- **Beskrivelse:** `glow-cta` har bløde gold/blue gradient hover — passer ikke til "Slet event"-knappen.
- **Fix:** Reservér `glow-cta` til primær positive handling. Slet/afmeld bruger `variant="destructive"` (eksisterer i button.tsx men bruges ikke uden for design-page).

### 38. Profile-page: photo-grid på mobil er kun 2 kolonner men billeder er 160px høje
- **Type:** mobile
- **Fil:** `profile-page.tsx:274,289`
- **Beskrivelse:** `grid-cols-2 sm:grid-cols-3` med `h-40` — på 375px bliver kort 167x160px. Slet-knap og badge konkurrerer om plads i bunden.
- **Fix:** På mobil bruger 1 kolonne med fuld bredde + slet/badge-row under billedet i stedet for overlay.

### 39. Membership-card lister 5 features ens-styled — ingen visuel hierarki
- **Type:** typography
- **Fil:** `membership-page.tsx:192-213`
- **Beskrivelse:** Alle 5 punkter har samme Check-ikon, samme tekst-størrelse. Ingen ankerpunkter for "det vigtigste".
- **Fix:** Frem hæv 2-3 nøglefeatures med bold eller variant-farve.

### 40. Login viser `EyeOff`-toggle uden synlig fokus
- **Type:** a11y
- **Fil:** `login-page.tsx:100-131`
- **Beskrivelse:** Eye-toggle har `variant="ghost"` og er positioneret absolut. Knappens fokus-ring tegnes ud i input-feltets territory.
- **Fix:** Tjek `focus-visible:ring`-offset. Sandsynligvis behov for ring-inset.

### 41. Site-shell admin-link mangler mobile-version
- **Type:** mobile
- **Fil:** `site-shell.tsx:117-122 vs 202-208`
- **Beskrivelse:** Admin-link findes i desktop OG mobile nav. Faktisk OK. Men "Log ud"-knappen ligger sidst i memberLinks-rækken på mobil og kan visuelt forveksles med nav-links — den er ikke destructive.
- **Fix:** Adskil "Log ud" med en lille separator-border + brug accent eller text-tertiary farve.

### 42. Tekst-størrelser inkonsistente: `text-[0.65rem]` vs `text-[0.66rem]` vs `text-xs`
- **Type:** typography
- **Filer:** `site-shell.tsx:174`, `landing-page.tsx:147`, mange profile/event-pages
- **Beskrivelse:** Mikro-størrelser bruger pixel-perfekte custom-værdier i stedet for tokens.
- **Fix:** Tilføj `--text-micro: 0.65rem` i tokens.css og brug konsekvent.

### 43. Form-felter mangler "required" markering visuelt
- **Type:** a11y / UX
- **Filer:** alle forms
- **Beskrivelse:** HTML `required`-attribut er sat (godt), men ingen visuel `*` eller "Påkrævet" notation. Brugeren ser først at det fejler ved submit.
- **Fix:** Tilføj `*` ved Label, eller skriv "(valgfri)" på de der ikke er required.

### 44. Eksplicit niveau-mærkning farve-kodes ikke
- **Type:** typography / branding
- **Filer:** `events-page.tsx`, `event-detail-page.tsx`
- **Beskrivelse:** Niveau 1-3 (sanseligt-socialt, sensuelt, eksplicit) vises alle som `<Badge variant="outline">` — ingen visuel differentiering. Tipping point for samtykke-klarhed.
- **Fix:** Definer 3 farve-niveauer: niveau 1 cool blue, niveau 2 warm accent, niveau 3 strong accent. Sæt det op i token-systemet.

### 45. Photo-upload accepterer kun via file-input, ingen drag-drop
- **Type:** missing-feature
- **Fil:** `profile-page.tsx:308-337`, `onboarding-page.tsx:325-331`
- **Beskrivelse:** Ingen drag/drop zone. Mobile er fine, men desktop bruger forventer drag-drop i 2026.
- **Fix:** Wrap label i drop-zone med `onDrop`-handler.

### 46. Admin-page søger og filtrerer client-side
- **Type:** missing-feature / scalability
- **Fil:** `admin-page.tsx:203-218`
- **Beskrivelse:** Hele lead-liste hentes og sorteres lokalt. Skalerer ikke ud over et par tusinde rækker.
- **Fix:** Backend-side pagination + filters. Markeres som teknisk gæld nu.

### 47. Send-knap i conversation har `size="icon"` (40x40) under 44x44 WCAG
- **Type:** a11y / mobile
- **Fil:** `conversation-page.tsx:186`
- **Beskrivelse:** `h-10 w-10` = 40px. WCAG 2.5.5 anbefaler 44x44 touch target.
- **Fix:** Brug `size="default"` eller udvid icon til 44.

---

## Lav

### 48. Stagger-animation gentages på indlogget sider (`memberLinks.map`)
- **Type:** motion
- **Fil:** `site-shell.tsx:100-169`
- **Beskrivelse:** Hver navigation/route-skift kører reveal-animation på nav-links. Føles uroligt.
- **Fix:** Animér kun ved første mount; brug `initial={false}` efter routing.

### 49. PWA-update-prompt placeret hvor?
- **Type:** missing-feature
- **Fil:** `pwa-update-prompt.tsx`
- **Beskrivelse:** Ser ikke ud til at være mounted nogen steder i `app.tsx`/`main.tsx`. Bør verificeres.
- **Fix:** Bekræft mount og test PWA-update-flow.

### 50. Onboarding "Næste: verificering" på sidste step — knap-tekst er for konkret
- **Type:** tone
- **Fil:** `onboarding-page.tsx:355`
- **Beskrivelse:** På sidste step bryder den ellers konsistente "Fortsæt" — fint for klarhed, men typografisk lige.
- **Fix:** OK som det er — eller match med "Til verificering →".

### 51. Member-detail: badges "Den der inviterer" / "Den der bestemmer tempoet" optager horisontal plads
- **Type:** mobile
- **Fil:** `member-detail-page.tsx:172-174`
- **Beskrivelse:** Lange badge-tekster wraps grimt på 375px.
- **Fix:** Forkort til "Inviterer" / "Bestemmer tempo".

### 52. Footer-link til Privacy hardt at finde
- **Type:** missing-feature
- **Filer:** landing-only
- **Beskrivelse:** Persona-data politik linkes kun fra: landing-form, login-card, signup-card, og inde i confirm-pages. Ikke fra logged-in flow.
- **Fix:** Footer (jvf #13).

### 53. `Indlæser…`-tekst inkonsistent: nogen steder "Henter…", andre "Henter events…"
- **Type:** tone
- **Filer:** members-page, events-page, my-events-page, messages-page
- **Beskrivelse:** Småinkonsistens. Tre forskellige loading-strenge.
- **Fix:** Standardisér til "Henter…" — eller bedre, brug skelet (#5).

### 54. Vision-page bruger "voksent fællesskab" i hero — godt — men intro siger "mennesker, der vil mødes i virkeligheden først" + "respekt og samtykke"
- **Type:** tone
- **Fil:** `vision-page.tsx:62-69`
- **Beskrivelse:** Ord-vise OK. Men landingside og vision lyder ens. Vision skal differentiere sig.
- **Fix:** Vision skal lægge mere lyst-, begær-vokabular ind (jvf beslutning 9's accepterede ord).

### 55. Banned word: "rejse" optræder som "Kan rejse sig" — false positive
- **Type:** tone
- **Fil:** `admin-events-page.tsx:376`
- **Beskrivelse:** "Kan rejse sig stille" = stå op-rejse, ikke indre-rejse. False positive ved automatisk scan, men nævnt for fuldstændighed.
- **Fix:** Ingen ændring nødvendig.

### 56. `font-display` Tailwind-klasse bruges blandet med `noxus-title` CSS-klasse
- **Type:** typography
- **Filer:** mange (se grep ovenfor)
- **Beskrivelse:** Dobbelt mønster — `noxus-title` bruges i hero/landings, `font-display` på cards. Ikke et bug, men splittet konvention.
- **Fix:** Vælg én. `noxus-title` er rigtige da den også sætter `letter-spacing` og `text-wrap`. Erstat `font-display` overalt.

### 57. Code of conduct, dresscode og exit-strategy vises kun som kort flat-text
- **Type:** typography
- **Fil:** `event-detail-page.tsx:194-210`
- **Beskrivelse:** Dresscode kunne være kicker + tekst, ikke kicker-style label uden visuel adskillelse.
- **Fix:** Lille refactor af event-detail meta-grid.

---

## Top-anbefalinger (prioriteret)

1. **Fix #1 + #7 + #8** sammen: gør alle klikbare kort til reelle `<a href>`-elementer med korrekt fokus-styling. Løser tastatur-a11y, touch og motion-respekt i én omgang.
2. **Fix #3**: Søg-erstat alle "trygt"/"tryghed"/"trygge rammer" undtagen privacy-page. Beslutning 9 er bindende.
3. **Fix #5**: Lav skeleton-grids til members/events/messages — det fjerner layout-shift og giver Nordic Noir-ro.
4. **Fix #6**: Migrér `window.confirm` til `Dialog`-modal — særligt rapport-flow er kritisk for moderation-kvalitet.
5. **Fix #2**: Ret theme-color så mobile address-bar matcher æstetikken.
6. **Fix #13**: Tilføj footer med privacy-link, support-mail, partner-link, copyright.
