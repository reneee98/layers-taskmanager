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
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Správa používateľov</h1>
        <p className="text-muted-foreground mt-1">
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
