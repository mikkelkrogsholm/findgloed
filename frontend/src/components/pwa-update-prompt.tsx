import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { type PwaState, subscribePwa } from "@/lib/pwa";

export function PwaUpdatePrompt() {
  const [state, setState] = useState<PwaState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return subscribePwa(setState);
  }, []);

  if (!state || dismissed || !state.needRefresh) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      className="glass-shell fixed inset-x-4 bottom-6 z-50 flex flex-col gap-3 rounded-2xl border border-[color:var(--border-subtle)] p-4 shadow-lg sm:left-auto sm:right-6 sm:max-w-sm"
    >
      <div className="space-y-1">
        <p
          id="pwa-update-title"
          className="font-display text-base text-[color:var(--color-text-primary)]"
        >
          Ny version klar
        </p>
        <p className="text-sm text-[color:var(--color-text-secondary)]">
          Genindlæs for at hente den nyeste version af Glød.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            void state.updateServiceWorker(true);
          }}
        >
          Genindlæs
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setDismissed(true);
          }}
        >
          Senere
        </Button>
      </div>
    </div>
  );
}
