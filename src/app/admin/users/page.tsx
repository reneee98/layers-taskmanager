import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { UserTable } from "@/components/admin/UserTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminUsersPage() {
  // Check if user is admin
  try {
    await requireAdmin();
  } catch (error) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Správa používateľov</h1>
        <p className="text-muted-foreground">
          Spravujte používateľov a ich oprávnenia v systéme
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Používatelia</CardTitle>
          <CardDescription>
            Zoznam všetkých registrovaných používateľov v systéme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable />
        </CardContent>
      </Card>
    </div>
  );
}
