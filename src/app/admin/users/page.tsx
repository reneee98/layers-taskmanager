import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { UserTable } from "@/components/admin/UserTable";
import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default async function AdminUsersPage() {
  // Check if user is admin
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Používatelia"
        description="Registrované účty a ich systémové oprávnenia."
        eyebrow="Administrácia"
        icon={UsersRound}
      />

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border bg-muted/[0.16] px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Všetci používatelia</h2>
          <p className="mt-1 text-xs text-muted-foreground">Správa účtov registrovaných v systéme.</p>
        </div>
        <div className="p-5">
          <UserTable />
        </div>
      </section>
    </div>
  );
}
