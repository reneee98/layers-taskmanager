import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nastavenia</h1>
        <p className="text-muted-foreground mt-1">
          Spravujte svoje nastavenia a preferencie
        </p>
      </div>

      <Card className="bg-card border border-border shadow-sm">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-foreground">Nastavenia sú dočasne vypnuté</CardTitle>
          <CardDescription className="text-muted-foreground">
            Funkcia nastavení je momentálne v údržbe a bude dostupná neskôr.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Môžete pokračovať v používaní ostatných funkcií aplikácie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
