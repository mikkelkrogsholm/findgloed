// Issue B20: Email-validering må ikke acceptere "a@b.c" eller absurd lange
// strenge. Vi cap'er på RFC 5321 (254 tegn) og kræver:
// - Mindst ét tegn i local-part (før @)
// - Domænet skal have mindst ét punktum og en TLD på mindst 2 tegn
// - Ingen dobbelt-punktum
// - Ingen whitespace eller kontrol-tegn
// - Ingen leading/trailing dot i local-part eller domain-label
//
// Vi bruger en konservativ regex frem for at importere zod for at holde
// backend slim. Dette dækker 99% af legit emails uden at acceptere absurde
// inputs som "a@b.c" eller "test@@example.com".
const EMAIL_LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const EMAIL_DOMAIN = /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

// RFC 5321 grænse på total email-længde.
const MAX_EMAIL_LENGTH = 254;
// RFC 5321 grænse på local-part-længde.
const MAX_LOCAL_PART_LENGTH = 64;

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }
  if (input.length === 0 || input.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  // Whitespace eller kontrol-tegn er aldrig OK i en email — ikke engang
  // efter trim, fordi de kan indlejres midt i strengen.
  // eslint-disable-next-line no-control-regex
  if (/[\s\x00-\x1F\x7F]/.test(input)) {
    return false;
  }
  // Skal indeholde præcis ét @.
  const atIndex = input.indexOf("@");
  if (atIndex < 0 || atIndex !== input.lastIndexOf("@")) {
    return false;
  }
  const local = input.slice(0, atIndex);
  const domain = input.slice(atIndex + 1);

  if (local.length === 0 || local.length > MAX_LOCAL_PART_LENGTH) {
    return false;
  }
  if (domain.length === 0) {
    return false;
  }
  // Domænet skal have mindst ét punktum og TLD på 2+ tegn.
  const lastDot = domain.lastIndexOf(".");
  if (lastDot < 0 || domain.length - lastDot - 1 < 2) {
    return false;
  }
  // Forbyd dobbelt-punktummer overalt.
  if (input.includes("..")) {
    return false;
  }

  if (!EMAIL_LOCAL_PART.test(local)) {
    return false;
  }
  if (!EMAIL_DOMAIN.test(domain)) {
    return false;
  }
  return true;
}
