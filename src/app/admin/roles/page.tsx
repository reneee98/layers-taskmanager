import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { RolesManager } from "@/components/admin/RolesManager";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

export default async function AdminRolesPage() {
  // Check if user is admin
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Role a oprávnenia"
        description="Vlastné role, prístup k funkciám a systémové pravidlá workspace."
        eyebrow="Administrácia"
        icon={ShieldCheck}
      />

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border bg-muted/[0.16] px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Nastavenie rolí</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Systémové role nie je možné upravovať ani mazať. Vlastným rolám môžete nastaviť presný rozsah oprávnení.
          </p>
        </div>
        <div className="p-5">
          <RolesManager />
        </div>
      </section>
    </div>
  );
}
