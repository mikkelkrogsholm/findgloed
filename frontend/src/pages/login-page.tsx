import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appConfig } from "@/config/app-config";
import { authClient } from "@/lib/auth-client";

function goToAdmin(): void {
  window.history.pushState({}, "", appConfig.routes.admin);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const result = await authClient.signIn.email({
        email,
        password
      });

      if (result.error) {
        setErrorMessage(result.error.message ?? "Kunne ikke logge ind.");
        return;
      }

      setMessage("Du er logget ind.");
      goToAdmin();
    } catch {
      setErrorMessage("Forbindelsesfejl. Prøv igen om lidt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-14 md:py-16">
      <Card className="p-8 md:p-10" data-testid="login-card">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Administrator login</CardTitle>
          <p className="body-text-muted text-sm">
            Kun administratorer har adgang her. Log ind for at se lead-oversigten.
          </p>
        </CardHeader>
        <CardContent className="space-y-5 px-0 pb-0">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="dig@eksempel.dk"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Adgangskode</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mindst 8 tegn"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Skjul adgangskode" : "Vis adgangskode"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 opacity-50 transition-opacity hover:opacity-100" />
                  ) : (
                    <Eye className="h-4 w-4 opacity-50 transition-opacity hover:opacity-100" />
                  )}
                </Button>
              </div>
            </div>

            {errorMessage && (
              <Alert>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full glow-cta">
              {loading ? "Arbejder..." : "Log ind"}
            </Button>
          </form>

          <a href={appConfig.routes.privacy} className="link-inline text-sm">
            Læs persondatapolitik
          </a>
        </CardContent>
      </Card>
    </section>
  );
}
