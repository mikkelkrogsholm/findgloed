import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// A22: Skeleton-state-komponenter der matcher det rigtige indhold.
// Bruges i stedet for "Indlæser…"-strengen så loading-state har samme
// dimensioner som final-state — fjerner layout-shift når data lander.

type GridProps = {
  /** Hvor mange skeleton-kort der vises. Default 6. */
  count?: number;
  /** Sektionens className — wrapper indeholder selv padding+max-width. */
  className?: string;
  /** Antal kolonner. Default "members" giver 1-2-3 responsivt. */
  variant?: "members" | "events" | "my-events" | "messages" | "list";
  "data-testid"?: string;
};

export function SkeletonGrid({
  count = 6,
  className,
  variant = "members",
  ...rest
}: GridProps) {
  if (variant === "messages" || variant === "list") {
    return (
      <div
        className={cn("space-y-3", className)}
        data-testid={rest["data-testid"]}
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-3">
              {variant === "messages" && (
                <Skeleton className="h-12 w-12 rounded-full" />
              )}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "my-events") {
    return (
      <div
        className={cn("space-y-4", className)}
        data-testid={rest["data-testid"]}
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="space-y-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-6 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // members / events grid: image-rectangle + 2 lines.
  return (
    <div
      className={cn(
        "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
      data-testid={rest["data-testid"]}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden p-0">
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="space-y-2 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Skeleton der matcher et card med form-layout (profile, onboarding, verification).
export function FormSkeleton({
  rows = 4,
  className,
  ...rest
}: {
  rows?: number;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <Card
      className={cn("p-6 md:p-8", className)}
      data-testid={rest["data-testid"]}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-2xl" />
          </div>
        ))}
        <Skeleton className="ml-auto h-10 w-32 rounded-full" />
      </div>
    </Card>
  );
}

// Skeleton-state for chat-konversation: header + 4-6 bubbles + composer.
export function ConversationSkeleton({
  className,
  "data-testid": testId
}: {
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <Card
      className={cn("flex flex-1 flex-col overflow-hidden p-0", className)}
      data-testid={testId}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="border-b border-[color:var(--border-subtle)] px-6 py-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-2 h-3 w-1/4" />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        <Skeleton className="ml-0 h-10 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="ml-0 h-12 w-3/4 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
      </div>
      <div className="border-t border-[color:var(--border-subtle)] px-6 py-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </Card>
  );
}
