import type { EventCategory, EventLevel } from "@/lib/api";

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  single_only: "Kun singles",
  couple_only: "Kun par",
  mixed: "Singles og par"
};

export const LEVEL_LABEL: Record<EventLevel, string> = {
  sensual_social: "Sanseligt-socialt",
  sensual: "Sensuelt",
  explicit: "Eksplicit"
};

export const LEVEL_DESCRIPTION: Record<EventLevel, string> = {
  sensual_social: "Påklædt, samtale, flirtende. Ingen krops-kontakt mellem fremmede.",
  sensual: "Afklædt eller delvist. Intimt med egen partner — ikke mellem fremmede.",
  explicit: "Alt går inden for samtykke."
};

export function formatPrice(cents: number): string {
  if (cents === 0) return "Gratis";
  return `${(cents / 100).toLocaleString("da-DK")} kr.`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
