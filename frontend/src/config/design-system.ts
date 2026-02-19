import { appConfig, type ThemePreset } from "@/config/app-config";

export type TokenItem = {
  label: string;
  variable: `--${string}`;
  note: string;
};

export type TokenGroup = {
  title: string;
  items: TokenItem[];
};

export type TypographyItem = {
  label: string;
  variable: `--${string}`;
  sample: string;
};

type ThemeDescriptor = {
  name: string;
  tone: string;
  tokenGroups: TokenGroup[];
  typography: TypographyItem[];
};

const sharedTokenGroups = [
  {
    title: "Brandfarver",
    items: [
      { label: "Accent", variable: "--color-accent", note: "Primær CTA og highlights" },
      { label: "Link", variable: "--color-link", note: "Inline links og sekundær handling" },
      { label: "Baggrund base", variable: "--color-bg-base", note: "Base-lag i gradient" },
      { label: "Baggrund mid", variable: "--color-bg-mid", note: "Mellemtoner i baggrund" },
      { label: "Baggrund slut", variable: "--color-bg-end", note: "Gradientens slutlag" }
    ]
  },
  {
    title: "Tekst og feedback",
    items: [
      { label: "Tekst primær", variable: "--color-text-primary", note: "Overskrifter og labels" },
      { label: "Tekst sekundær", variable: "--color-text-secondary", note: "Brødtekst" },
      { label: "Tekst tertiær", variable: "--color-text-tertiary", note: "Hjælpetekst og metadata" },
      { label: "Danger", variable: "--color-danger", note: "Fejlbeskeder og risikohandlinger" }
    ]
  },
  {
    title: "Glass surfaces",
    items: [
      { label: "Header surface", variable: "--glass-header-surface", note: "Top-navigation" },
      { label: "Shell surface", variable: "--glass-shell-surface", note: "Hero/safe container" },
      { label: "Card surface", variable: "--glass-card-surface", note: "Kort og indholdspaneler" },
      { label: "Pill surface", variable: "--glass-pill-surface", note: "Pills og badges" }
    ]
  }
] as const satisfies TokenGroup[];

const sharedTypography = [
  {
    label: "Display",
    variable: "--font-display",
    sample: "Glød samler mennesker omkring kuraterede events."
  },
  {
    label: "Body",
    variable: "--font-body",
    sample: "Denne tekst viser standardsnit til UI, labels og forklaringer."
  },
  {
    label: "Kicker",
    variable: "--font-kicker",
    sample: "TRYGHED OG KLARHED FØRST"
  }
] as const satisfies TypographyItem[];

const presets: Record<ThemePreset, ThemeDescriptor> = {
  legacy: {
    name: "Legacy",
    tone: "Varm klassisk palette med stærk accent og høj energi.",
    tokenGroups: [...sharedTokenGroups],
    typography: [...sharedTypography]
  },
  "anthro-v1": {
    name: "Anthro v1",
    tone: "Editorial serif + clean sans med roligere kontrast og tryghed i fokus.",
    tokenGroups: [...sharedTokenGroups],
    typography: [...sharedTypography]
  }
};

export const designSystem = {
  title: "Glød Design System",
  description:
    "Token-baseret oversigt over typografi, farver og komponenter. Alle visuelle valg styres via CSS-variabler i styles/tokens.css.",
  activePreset: appConfig.themePreset,
  principles: [
    "Safe container feeling: event-first framing med varm og kurateret tone.",
    "Frosted glass med reel transparens, blur og tydelig læsbarhed.",
    "Editorial serif til overskrifter og ren sans-serif til brødtekst.",
    "Subtil motion med respekt for prefers-reduced-motion.",
    "Neutral og inkluderende copy med fokus på tryghedssignaler."
  ],
  presets,
  tokenGroups: presets[appConfig.themePreset].tokenGroups,
  typography: presets[appConfig.themePreset].typography,
  componentCopy: {
    inputLabel: "Email",
    inputPlaceholder: "dig@eksempel.dk",
    alertText: "Denne alert bruger udelukkende token-baserede farver.",
    cardTitle: "Token-baseret card",
    cardBody: "shadcn-komponenter skinnes via tokens og primitives uden hardkodede farver."
  }
} as const;
