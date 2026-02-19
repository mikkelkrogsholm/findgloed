export type TokenItem = {
  label: string;
  variable: `--${string}`;
  note: string;
};

export type TokenGroup = {
  title: string;
  items: TokenItem[];
};

export const designSystem = {
  title: "Glod Design System",
  description:
    "Token-baseret oversigt over typografi, farver og komponenter. Alle visuelle valg styres via CSS variables i styles/tokens.css.",
  tokenGroups: [
    {
      title: "Brandfarver",
      items: [
        { label: "Accent", variable: "--color-accent", note: "Primar CTA og highlights" },
        { label: "Link", variable: "--color-link", note: "Inline links og sekundar handling" },
        { label: "Baggrund base", variable: "--color-bg-base", note: "Base lag" },
        { label: "Baggrund mid", variable: "--color-bg-mid", note: "Gradient mellemtoner" },
        { label: "Baggrund slut", variable: "--color-bg-end", note: "Gradient slut" }
      ]
    },
    {
      title: "Tekst og feedback",
      items: [
        { label: "Tekst primar", variable: "--color-text-primary", note: "Overskrifter" },
        { label: "Tekst sekundar", variable: "--color-text-secondary", note: "Brodtekst" },
        { label: "Tekst tertiar", variable: "--color-text-tertiary", note: "Hjaelpetekst" },
        { label: "Danger", variable: "--color-danger", note: "Fejlbeskeder" }
      ]
    },
    {
      title: "Glass surfaces",
      items: [
        { label: "Header surface", variable: "--glass-header-surface", note: "Top navigation" },
        { label: "Panel surface", variable: "--glass-panel-surface", note: "Standard glass" },
        { label: "Panel intense", variable: "--glass-panel-intense-surface", note: "Card glass" },
        { label: "Stage surface", variable: "--glass-stage-surface", note: "Hero wrapper" }
      ]
    }
  ] satisfies TokenGroup[],
  typography: [
    {
      label: "Display",
      variable: "--font-display",
      sample: "Glod skaber virkelige modepunkter mellem mennesker"
    },
    {
      label: "Body",
      variable: "--font-body",
      sample: "Denne tekst viser standardsnit til brodtekst, labels og lister."
    },
    {
      label: "Kicker",
      variable: "--font-kicker",
      sample: "KURATERET EVENT PLATFORM"
    }
  ],
  componentCopy: {
    inputLabel: "Email",
    inputPlaceholder: "dig@eksempel.dk",
    alertText: "Denne alert bruger udelukkende token-baserede farver.",
    cardTitle: "Token-baseret Card",
    cardBody: "Cards er custom shadcn-komponenter, hvor glass, border og shadow styres fra tokens.css."
  }
} as const;
