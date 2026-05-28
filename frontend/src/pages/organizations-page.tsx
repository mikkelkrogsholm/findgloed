import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { appConfig } from "@/config/app-config";
import { api, type PublicOrganization } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";
import { navigate } from "@/lib/nav";

export function OrganizationsPage() {
  const [orgs, setOrgs] = useState<PublicOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const motionMode = getMotionMode();

  useEffect(() => {
    void (async () => {
      const result = await api.listPublicOrganizations({ limit: 100 });
      setLoading(false);
      if (!result.ok) {
        setError("Kunne ikke hente arrangører.");
        return;
      }
      setOrgs(result.organizations);
    })();
  }, []);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10 md:py-16" data-testid="organizations-page">
      <motion.div initial="hidden" animate="visible" variants={revealVariants(motionMode, "hero")}>
        <PageHeader
          kicker="ARRANGØRER"
          title="Arrangører"
          description="Organisationerne bag Gløds events — klubber, fagpersoner og fællesskaber der skaber rammer for nærvær og sanselighed."
        />

        {error && (
          <Alert role="alert" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="body-text-muted text-sm">Indlæser…</p>
        ) : orgs.length === 0 ? (
          <p className="body-text-muted text-center">Ingen arrangører endnu.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {orgs.map((org) => (
              <Card
                key={org.id}
                className="cursor-pointer p-5 transition hover:border-[color:var(--border-strong)]"
                data-testid={`public-org-${org.slug}`}
                onClick={() => navigate(`${appConfig.routes.organizations}/${org.slug}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-display text-lg">{org.name}</p>
                    {org.region && <Badge variant="outline">{org.region}</Badge>}
                  </div>
                </div>
                {org.description && (
                  <p className="body-text-muted mt-2 line-clamp-3 text-sm">{org.description}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
