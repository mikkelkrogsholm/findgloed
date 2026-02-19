import { useEffect, useMemo, useState } from "react";

import { appConfig } from "@/config/app-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

type ConfirmResult = {
  ok: boolean;
  status?: "confirmed" | "already_confirmed" | "invalid" | "expired";
  message?: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4564";

type ConfirmState = "loading" | "success" | "already_confirmed" | "invalid" | "expired" | "error";

export function PartnerConfirmPage() {
  const [state, setState] = useState<ConfirmState>("loading");
  const [message, setMessage] = useState("Vi bekræfter din henvendelse...");

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token")?.trim() ?? "";
  }, []);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setMessage("Ugyldig bekræftelseskode.");
      return;
    }

    const controller = new AbortController();

    async function run() {
      try {
        const response = await fetch(
          `${API_URL}/api/partner-interest/confirm?token=${encodeURIComponent(token)}`,
          {
            signal: controller.signal
          }
        );

        const payload = (await response.json()) as ConfirmResult;

        if (response.ok && payload.ok && payload.status === "confirmed") {
          setState("success");
          setMessage(payload.message ?? "Din henvendelse er bekræftet. Vi vender tilbage.");
          return;
        }

        if (response.ok && payload.ok && payload.status === "already_confirmed") {
          setState("already_confirmed");
          setMessage(payload.message ?? "Din henvendelse er allerede bekræftet.");
          return;
        }

        if (response.status === 410 || payload.status === "expired") {
          setState("expired");
          setMessage(payload.message ?? "Bekræftelseslinket er udløbet.");
          return;
        }

        if (response.status === 400 || payload.status === "invalid") {
          setState("invalid");
          setMessage(payload.message ?? "Ugyldig bekræftelseskode.");
          return;
        }

        setState("error");
        setMessage(payload.message ?? "Noget gik galt. Prøv igen senere.");
      } catch {
        setState("error");
        setMessage("Forbindelsesfejl. Prøv igen om lidt.");
      }
    }

    run();

    return () => {
      controller.abort();
    };
  }, [token]);

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-24">
      <Card className="p-8 md:p-10">
        <CardContent className="space-y-4 pt-0">
          <CardTitle>Bekræft samarbejdspartner-forespørgsel</CardTitle>

          {state === "loading" && <p className="body-text">{message}</p>}

          {(state === "success" || state === "already_confirmed") && (
            <Alert variant="success">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {(state === "invalid" || state === "expired" || state === "error") && (
            <Alert variant="error">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <a href={appConfig.routes.vision}>Til vision</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={appConfig.routes.privacy}>Læs persondatapolitik</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
