import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// B25: Konsistent header-mønster på tværs af alle indlogget-sider.
// Sikrer kicker → h1 → description-rækkefølge så hierarkiet er ens
// (og semantisk korrekt — kun én <h1> pr. side).
type Props = {
  kicker: string;
  title: string;
  description?: ReactNode;
  className?: string;
  /** Slot til actions/CTAs til højre for header på desktop. */
  actions?: ReactNode;
  /** data-testid videresendes til root-elementet. */
  "data-testid"?: string;
};

export function PageHeader({
  kicker,
  title,
  description,
  className,
  actions,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        className
      )}
      data-testid={rest["data-testid"]}
    >
      <div className="max-w-2xl">
        <p className="noxus-kicker kicker-text text-[0.65rem]">{kicker}</p>
        <h1 className="font-display text-3xl">{title}</h1>
        {description && (
          <p className="body-text-muted mt-1 text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
