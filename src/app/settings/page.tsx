import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nastavenia</h1>
        <p className="text-gray-600 mt-1">
          Spravujte svoje nastavenia a preferencie
        </p>
      </div>

      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-gray-900">Nastavenia sú dočasne vypnuté</CardTitle>
          <CardDescription className="text-gray-600">
            Funkcia nastavení je momentálne v údržbe a bude dostupná neskôr.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Môžete pokračovať v používaní ostatných funkcií aplikácie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
