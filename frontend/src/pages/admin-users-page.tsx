import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import { AdminSubnav } from "@/components/admin/admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, type UserRole } from "@/lib/api";
import { getMotionMode, revealVariants } from "@/lib/motion";

type AdminUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  verification_status: string;
  onboarded_at: string | null;
  paused_at: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "administrator",
  organizer: "arrangør",
  user: "almindelig bruger"
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK");
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    user: AdminUser;
    newRole: UserRole;
  } | null>(null);
  const [acting, setActing] = useState(false);

  const motionMode = getMotionMode();

  async function reload() {
    setLoading(true);
    setError("");
    const result = await api.listAdminUsers({ limit: 200 });
    setLoading(false);
    if (!result.ok) {
      if (result.code === "FORBIDDEN") {
        setForbidden(true);
        return;
      }
      setError("Kunne ikke hente brugere.");
      return;
    }
    setUsers(result.items);
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.display_name ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  async function performRoleChange() {
    if (!confirmAction) return;
    setActing(true);
    const result = await api.setUserRole(confirmAction.user.user_id, confirmAction.newRole);
    setActing(false);
    if (!result.ok) {
      const msg =
        result.code === "CANNOT_DEMOTE_SELF"
          ? "Du kan ikke fjerne din egen admin-rolle."
          : result.code === "CANNOT_DEMOTE_SUPERADMIN"
            ? "Superadminen kan ikke nedgraderes."
            : "Kunne ikke ændre rollen.";
      setError(msg);
      setConfirmAction(null);
      return;
    }
    setSuccess(`${confirmAction.user.email} er nu ${ROLE_LABEL[confirmAction.newRole]}.`);
    setConfirmAction(null);
    await reload();
  }

  if (forbidden) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <Alert role="alert">
          <AlertDescription>Du har ikke adgang til denne side.</AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-12" data-testid="admin-users-page">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <PageHeader
          kicker="BRUGERE"
          title="Administrer brugere"
          description="Promote eller fjern administratorer. Du kan ikke fjerne din egen rolle eller nedgradere superadminen."
        />

        <AdminSubnav />

        {error && (
          <Alert role="alert" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert role="status" className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <Input
            type="search"
            placeholder="Søg på email eller navn"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="search-input"
          />
        </div>

        <Card className="p-6 md:p-8">
          <CardContent className="px-0 pb-0">
            {loading ? (
              <p className="text-sm text-[color:var(--color-text-secondary)]">Indlæser…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-[color:var(--color-text-secondary)]">
                Ingen brugere matcher.
              </p>
            ) : (
              <ul className="divide-y divide-[color:var(--border-subtle)]">
                {filtered.map((user) => (
                  <li
                    key={user.user_id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                    data-testid={`user-row-${user.user_id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {user.display_name || "(intet navn)"}
                        </span>
                        {user.role === "admin" && (
                          <Badge variant="outline">Admin</Badge>
                        )}
                        {user.role === "organizer" && (
                          <Badge variant="outline">Arrangør</Badge>
                        )}
                        {user.verification_status !== "verified" && (
                          <Badge variant="outline">Ikke verificeret</Badge>
                        )}
                        {user.paused_at && <Badge variant="outline">Pause</Badge>}
                      </div>
                      <p className="text-xs text-[color:var(--color-text-tertiary)]">
                        {user.email} · oprettet {formatDate(user.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.role !== "admin" && (
                        <Button
                          type="button"
                          onClick={() => setConfirmAction({ user, newRole: "admin" })}
                          data-testid={`promote-admin-${user.user_id}`}
                        >
                          Gør til admin
                        </Button>
                      )}
                      {user.role !== "organizer" && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirmAction({ user, newRole: "organizer" })}
                          data-testid={`promote-organizer-${user.user_id}`}
                        >
                          Gør til arrangør
                        </Button>
                      )}
                      {user.role !== "user" && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setConfirmAction({ user, newRole: "user" })}
                          data-testid={`demote-${user.user_id}`}
                        >
                          Sæt til bruger
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent data-testid="confirm-role-dialog">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.newRole === "admin"
                ? "Gør til administrator?"
                : confirmAction?.newRole === "organizer"
                  ? "Gør til arrangør?"
                  : "Sæt tilbage til almindelig bruger?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.newRole === "admin"
                ? `${confirmAction?.user.email} får fuld admin-adgang til alle sider, brugere, events og indstillinger.`
                : confirmAction?.newRole === "organizer"
                  ? `${confirmAction?.user.email} kan oprette og administrere organisationer og deres events.`
                  : `${confirmAction?.user.email} mister sine udvidede rettigheder. Du kan altid ændre rollen igen senere.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmAction(null)}
              disabled={acting}
            >
              Annullér
            </Button>
            <Button
              onClick={performRoleChange}
              disabled={acting}
              data-testid="confirm-role-button"
            >
              {acting ? "Gemmer…" : "Bekræft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
