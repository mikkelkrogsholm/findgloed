import { appConfig } from "@/config/app-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-24">
      <Card className="p-8 md:p-10">
        <CardContent className="space-y-4 pt-0">
          {/* B25: konsistent kicker → h1 hierarki også på error-sider. */}
          <p className="noxus-kicker kicker-text text-[0.65rem]">Fejl 404</p>
          <h1 className="font-display text-3xl">Side ikke fundet</h1>
          <p className="body-text">Siden findes ikke, eller er deaktiveret i dette miljø.</p>
          <Button asChild>
            <a href={appConfig.routes.landing}>Til forsiden</a>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
