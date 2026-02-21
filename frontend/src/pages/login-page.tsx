import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appConfig } from "@/config/app-config";
import { authClient } from "@/lib/auth-client";
import { getMotionMode, revealVariants, staggerContainerVariants, successRevealVariants } from "@/lib/motion";

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
  const motionMode = getMotionMode();
  const successVariants = successRevealVariants(motionMode);

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
    <section className="mx-auto w-full max-w-md px-6 py-14 md:py-20">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={revealVariants(motionMode, "hero")}
      >
        <Card className="p-8 md:p-10" data-testid="login-card">
          <CardHeader className="px-0 pt-0">
            <p className="noxus-kicker kicker-text mb-2 text-[0.65rem]">Kun for administratorer</p>
            <CardTitle>Log ind</CardTitle>
            <p className="body-text-muted mt-1 text-sm">
              Log ind for at se lead-oversigten og administrere platformen.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 px-0 pb-0">
            <motion.form
              className="space-y-4"
              onSubmit={onSubmit}
              variants={staggerContainerVariants(motionMode, "section")}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="space-y-2" variants={revealVariants(motionMode, "item")}>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="dig@eksempel.dk"
                  required
                />
              </motion.div>

              <motion.div className="space-y-2" variants={revealVariants(motionMode, "item")}>
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
                    <AnimatePresence mode="wait">
                      {showPassword ? (
                        <motion.span
                          key="eye-off"
                          initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
                          animate={{ opacity: 0.5, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.7, rotate: 10 }}
                          transition={{ duration: 0.18 }}
                        >
                          <EyeOff className="h-4 w-4 transition-opacity hover:opacity-100" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="eye"
                          initial={{ opacity: 0, scale: 0.7, rotate: 10 }}
                          animate={{ opacity: 0.5, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.7, rotate: -10 }}
                          transition={{ duration: 0.18 }}
                        >
                          <Eye className="h-4 w-4 transition-opacity hover:opacity-100" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </motion.div>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    key="error"
                    variants={successVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Alert>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
                {message && (
                  <motion.div
                    key="message"
                    variants={successVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Alert>
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={revealVariants(motionMode, "item")}>
                <Button type="submit" disabled={loading} className="w-full glow-cta">
                  {loading ? "Arbejder..." : "Log ind"}
                </Button>
              </motion.div>
            </motion.form>

            <a href={appConfig.routes.privacy} className="link-inline text-sm">
              Læs persondatapolitik
            </a>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
