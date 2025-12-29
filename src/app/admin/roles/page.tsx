import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { RolesManager } from "@/components/admin/RolesManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminRolesPage() {
  // Check if user is admin
  try {
    await requireAdmin();
  } catch (error) {
    redirect("/");
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Správa rolí a oprávnení</h1>
        <p className="text-muted-foreground mt-1">
          Vytvárajte a spravujte role používateľov a ich oprávnenia v systéme. Systémové role: Majiteľ, Člen, Administrátor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role a oprávnenia</CardTitle>
          <CardDescription>
            Vytvárajte vlastné role a nastavujte im oprávnenia pre rôzne zdroje v systéme. Systémové role (Majiteľ, Člen, Administrátor) nie je možné upravovať ani mazať.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolesManager />
        </CardContent>
      </Card>
    </div>
  );
}

