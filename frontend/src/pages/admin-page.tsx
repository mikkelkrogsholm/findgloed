import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4564";

type LeadItem = {
  id: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  source: string;
  marketing_opt_in: boolean;
  created_at: string;
  confirmed_at: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
};

type LeadsPayload = {
  ok: true;
  items: LeadItem[];
  meta: {
    total: number;
    confirmed: number;
    pending: number;
  };
};

type ErrorPayload = {
  ok: false;
  code?: string;
  message?: string;
};

type SortField = "created_at" | "email" | "status" | "confirmed_at";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "pending" | "confirmed" | "unsubscribed";
type MarketingFilter = "all" | "yes" | "no";

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return date.toLocaleString("da-DK");
}

function compareByField(a: LeadItem, b: LeadItem, sortField: SortField): number {
  if (sortField === "email") {
    return a.email.localeCompare(b.email, "da", { sensitivity: "base" });
  }

  if (sortField === "status") {
    return a.status.localeCompare(b.status, "da", { sensitivity: "base" });
  }

  const aValue = sortField === "confirmed_at" ? a.confirmed_at : a.created_at;
  const bValue = sortField === "confirmed_at" ? b.confirmed_at : b.created_at;
  const aTime = aValue ? new Date(aValue).getTime() : 0;
  const bTime = bValue ? new Date(bValue).getTime() : 0;

  return aTime - bTime;
}

function sortRows(rows: LeadItem[], sortField: SortField, sortDirection: SortDirection): LeadItem[] {
  const factor = sortDirection === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => compareByField(a, b, sortField) * factor);
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function toCsv(rows: LeadItem[]): string {
  const headers = [
    "id",
    "email",
    "status",
    "source",
    "marketing_opt_in",
    "created_at",
    "confirmed_at",
    "terms_accepted_at",
    "privacy_accepted_at"
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.email,
      row.status,
      row.source,
      row.marketing_opt_in ? "true" : "false",
      row.created_at,
      row.confirmed_at ?? "",
      row.terms_accepted_at ?? "",
      row.privacy_accepted_at ?? ""
    ]
      .map((value) => escapeCsvValue(value))
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}

function triggerCsvDownload(filename: string, rows: LeadItem[]): void {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LeadItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, confirmed: 0, pending: 0 });
  const [errorMessage, setErrorMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [marketingFilter, setMarketingFilter] = useState<MarketingFilter>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`${API_URL}/api/admin/leads`, {
          credentials: "include"
        });

        if (response.status === 401) {
          if (!cancelled) {
            setErrorMessage("Log ind for adgang.");
          }
          return;
        }

        if (response.status === 403) {
          if (!cancelled) {
            setErrorMessage("Du har ikke adgang.");
          }
          return;
        }

        const payload = (await response.json()) as LeadsPayload | ErrorPayload;
        if (!response.ok || !payload.ok) {
          if (!cancelled) {
            setErrorMessage(payload.message ?? "Kunne ikke hente tilmeldinger.");
          }
          return;
        }

        if (!cancelled) {
          setItems(payload.items);
          setMeta(payload.meta);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Forbindelsesfejl. Prøv igen om lidt.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = items.filter((item) => {
      const matchesQuery = query.length === 0 || item.email.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesMarketing =
        marketingFilter === "all" ||
        (marketingFilter === "yes" && item.marketing_opt_in) ||
        (marketingFilter === "no" && !item.marketing_opt_in);

      return matchesQuery && matchesStatus && matchesMarketing;
    });

    return sortRows(result, sortField, sortDirection);
  }, [items, searchQuery, statusFilter, marketingFilter, sortField, sortDirection]);

  const allSortedItems = useMemo(
    () => sortRows(items, sortField, sortDirection),
    [items, sortField, sortDirection]
  );

  const filteredMeta = useMemo(
    () => ({
      total: filteredItems.length,
      confirmed: filteredItems.filter((item) => item.status === "confirmed").length,
      pending: filteredItems.filter((item) => item.status === "pending").length
    }),
    [filteredItems]
  );

  const hasData = useMemo(() => filteredItems.length > 0, [filteredItems.length]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-14 md:py-16" data-testid="admin-page">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Admin-overblik: Tilmeldte</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-0 pb-0 md:grid-cols-3">
          <div className="glass-pill rounded-xl p-4">
            <p className="body-text-muted text-xs">Total (viste)</p>
            <p className="text-2xl font-semibold">{filteredMeta.total}</p>
          </div>
          <div className="glass-pill rounded-xl p-4">
            <p className="body-text-muted text-xs">Bekræftet (viste)</p>
            <p className="text-2xl font-semibold">{filteredMeta.confirmed}</p>
          </div>
          <div className="glass-pill rounded-xl p-4">
            <p className="body-text-muted text-xs">Afventer (viste)</p>
            <p className="text-2xl font-semibold">{filteredMeta.pending}</p>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="body-text-muted">Henter tilmeldinger...</p>}

      {errorMessage && (
        <Alert>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {!loading && !errorMessage && (
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Filtre, sortering og eksport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0">
            <p className="body-text-muted text-sm">Viser {filteredItems.length} af {meta.total} tilmeldinger.</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="email-search">Søg på email</Label>
                <Input
                  id="email-search"
                  placeholder="fx navn@eksempel.dk"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <select
                  id="status-filter"
                  className="input-field flex h-11 w-full px-4 py-2 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  <option value="all">Alle</option>
                  <option value="pending">Afventer</option>
                  <option value="confirmed">Bekræftet</option>
                  <option value="unsubscribed">Afmeldt</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketing-filter">Marketing</Label>
                <select
                  id="marketing-filter"
                  className="input-field flex h-11 w-full px-4 py-2 text-sm"
                  value={marketingFilter}
                  onChange={(event) => setMarketingFilter(event.target.value as MarketingFilter)}
                >
                  <option value="all">Alle</option>
                  <option value="yes">Ja</option>
                  <option value="no">Nej</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-field">Sortering</Label>
                <div className="flex gap-2">
                  <select
                    id="sort-field"
                    className="input-field flex h-11 w-full px-4 py-2 text-sm"
                    value={sortField}
                    onChange={(event) => setSortField(event.target.value as SortField)}
                  >
                    <option value="created_at">Oprettet</option>
                    <option value="email">Email</option>
                    <option value="status">Status</option>
                    <option value="confirmed_at">Bekræftet</option>
                  </select>
                  <select
                    aria-label="Sortering retning"
                    className="input-field flex h-11 w-24 px-2 py-2 text-sm"
                    value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                  >
                    <option value="desc">↓</option>
                    <option value="asc">↑</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => triggerCsvDownload("leads-visible.csv", filteredItems)}>
                Eksportér viste (CSV)
              </Button>
              <Button type="button" variant="secondary" onClick={() => triggerCsvDownload("leads-all.csv", allSortedItems)}>
                Eksportér alle (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !errorMessage && hasData && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kilde</TableHead>
              <TableHead>Marketing</TableHead>
              <TableHead>Oprettet</TableHead>
              <TableHead>Bekræftet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.source}</TableCell>
                <TableCell>{item.marketing_opt_in ? "Ja" : "Nej"}</TableCell>
                <TableCell>{formatDate(item.created_at)}</TableCell>
                <TableCell>{formatDate(item.confirmed_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && !errorMessage && !hasData && (
        <p className="body-text-muted">Ingen tilmeldinger matcher dit filter.</p>
      )}
    </section>
  );
}
