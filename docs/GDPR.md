# GDPR-dokumentation — Findgloed

> Dette dokument er et internt arbejdsdokument til brug for compliance. Det er ikke en privatlivspolitik til brugere.

---

## 1. Dataansvarlig

| Felt | Værdi |
|------|-------|
| Virksomhed | UDFYLD (CVR: UDFYLD) |
| Adresse | UDFYLD |
| Kontaktperson | UDFYLD |
| Email | UDFYLD |

---

## 2. Databehandlere

| Databehandler | Rolle | Data der behandles | Placering | DPA |
|---------------|-------|--------------------|-----------|-----|
| Hetzner Online GmbH | Serverhosting | Alle persondata (lagret på server) | HEL1, Helsinki, Finland (EU) | [hetzner.com/legal/privacy](https://www.hetzner.com/legal/privacy) |
| Resend Inc. | Transaktionel email | Email-adresser, email-indhold | USA (SCC inkluderet i DPA) | [resend.com/legal/dpa](https://resend.com/legal/dpa) — [PDF](https://resend.com/static/documents/resend-dpa-signed.pdf) |
| Umami (self-hosted) | Web analytics | Anonymiserede sidevisninger, ingen cookies | HEL1, Helsinki, Finland (EU) — samme Hetzner-server | Ikke relevant — vi er selv databehandler |

### DPA-status

- [ ] Hetzner DPA underskrevet
- [ ] Resend DPA underskrevet og gemt

---

## 3. Persondata der behandles

### Waitlist-tilmelding

| Datakategori | Felt | Formål | Retsgrundlag | Opbevaringstid |
|--------------|------|--------|--------------|----------------|
| Kontaktoplysninger | Email-adresse | Kommunikation om produktlancering | Samtykke (GDPR art. 6.1.a) | Indtil samtykke trækkes tilbage eller produktet lukker |
| Bekræftelsesstatus | Bekræftet/ubekræftet | Validere email-adresse | Legitim interesse (art. 6.1.f) | Samme som ovenfor |
| Tilmeldingstidspunkt | Timestamp | Dokumentation af samtykke | Retlig forpligtelse (art. 6.1.c) | 5 år |

### Partner-tilmelding

| Datakategori | Felt | Formål | Retsgrundlag | Opbevaringstid |
|--------------|------|--------|--------------|----------------|
| Kontaktoplysninger | Email-adresse | Partnerkorrespondance | Samtykke (GDPR art. 6.1.a) | Indtil samtykke trækkes tilbage |
| Bekræftelsesstatus | Bekræftet/ubekræftet | Validere email-adresse | Legitim interesse (art. 6.1.f) | Samme som ovenfor |

### Administrator-brugere

| Datakategori | Felt | Formål | Retsgrundlag | Opbevaringstid |
|--------------|------|--------|--------------|----------------|
| Kontaktoplysninger | Email-adresse | Login og adgangsstyring | Legitim interesse (art. 6.1.f) | Så længe ansættelsesforholdet/samarbejdet består |
| Autentificering | Sessions, tokens | Sikkerhed | Legitim interesse (art. 6.1.f) | Session-varighed |

---

## 4. Tekniske og organisatoriske sikkerhedsforanstaltninger (TOMs)

| Tiltag | Implementering |
|--------|----------------|
| Kryptering under transport | TLS 1.2+ via Let's Encrypt (Traefik) |
| Cookiefri analytics | Umami self-hosted — ingen tracking-cookies, ingen tredjepart |
| Kryptering i hvile | Hetzner disk-kryptering (server-niveau) |
| Adgangskontrol | SSH-nøgler kun, ingen password-login |
| Autentificering | Better Auth med sikre sessions |
| Rate limiting | Redis-baseret rate limiting på alle endpoints |
| HSTS | Aktiveret (31536000 sekunder) |
| Backups | UDFYLD (Hetzner Snapshots / manuel strategi) |
| Adgang til produktion | Begrænset til navngivne administratorer |

---

## 5. Registreredes rettigheder

Procedure for håndtering af rettigheder under GDPR art. 15-22:

| Rettighed | Håndtering |
|-----------|------------|
| Indsigt (art. 15) | UDFYLD — manuel forespørgsel til support@findgloed.dk |
| Berigtigelse (art. 16) | UDFYLD |
| Sletning (art. 17) | UDFYLD — slet fra `leads`-tabel i database |
| Dataportabilitet (art. 20) | UDFYLD |
| Indsigelse (art. 21) | Samtykke kan trækkes via UDFYLD |

---

## 6. Brud på persondatasikkerhed

Procedure ved sikkerhedsbrud (GDPR art. 33-34):

1. Identificer omfang og hvilke data der er berørt
2. Vurder risiko for de registrerede
3. Anmeld til Datatilsynet inden 72 timer hvis høj risiko: [datatilsynet.dk](https://www.datatilsynet.dk)
4. Underret berørte registrerede hvis meget høj risiko
5. Dokumenter hændelsen internt

Datatilsynets anmeldelsesportal: [anmeld.datatilsynet.dk](https://anmeld.datatilsynet.dk)

---

## 7. Overførsler til tredjelande

| Modtager | Land | Overførselsgrundlag |
|----------|------|---------------------|
| Resend Inc. | USA | Standard Contractual Clauses (SCC) — inkluderet i Resends DPA |

Alle øvrige data forbliver i EU/EØS (Hetzner HEL1, Finland).

---

## 8. Åbne punkter

- [ ] Udfyld dataansvarlig-oplysninger (sektion 1)
- [ ] Underskriv Hetzner DPA
- [ ] Underskriv og gem Resend DPA
- [ ] Definer backup-strategi og dokumenter den
- [ ] Beskriv procedure for indsigt og sletning (sektion 5)
- [ ] Skriv privatlivspolitik til hjemmesiden
- [ ] Vurder om der er krav om DPO (databeskyttelsesrådgiver)
