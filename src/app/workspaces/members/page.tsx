import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { WorkspaceMembers } from "@/components/workspace/WorkspaceMembers";

export default async function WorkspaceMembersPage() {
  const user = await getServerUser();
  
  if (!user) {
    redirect("/login");
  }
  
  const supabase = createClient();
  
  // Get user's workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name, description, owner_id, created_at')
    .eq('owner_id', user.id)
    .single();
  
  if (workspaceError || !workspace) {
    redirect("/dashboard");
  }
  
  // Check if user is owner (they should be since we filtered by owner_id)
  if (workspace.owner_id !== user.id) {
    redirect("/dashboard");
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Správa používateľov</h1>
        <p className="text-muted-foreground mt-2">
          Spravujte používateľov vo vašom workspace
        </p>
      </div>
      
      <WorkspaceMembers workspaceId={workspace.id} />
    </div>
  );
}
