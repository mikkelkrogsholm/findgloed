import { appConfig } from "@/config/app-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-24">
      <Card className="p-8 md:p-10">
        <CardContent className="space-y-4 pt-0">
          <CardTitle>Side ikke fundet</CardTitle>
          <p className="body-text">Siden findes ikke, eller er deaktiveret i dette miljo.</p>
          <Button asChild>
            <a href={appConfig.routes.landing}>Til forsiden</a>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
