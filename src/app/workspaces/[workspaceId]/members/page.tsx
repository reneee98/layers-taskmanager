import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { WorkspaceMembers } from "@/components/workspace/WorkspaceMembers";
import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

interface PageProps {
  params: {
    workspaceId: string;
  };
}

export default async function WorkspaceMembersPage({ params }: PageProps) {
  const user = await getServerUser();
  
  if (!user) {
    redirect("/login");
  }
  
  const supabase = createClient();
  
  // Check if user has access to workspace
  const { data: hasAccess, error: accessError } = await supabase
    .rpc('user_has_workspace_access', { 
      p_user_id: user.id, 
      p_workspace_id: params.workspaceId 
    });
  
  if (accessError || !hasAccess) {
    redirect("/dashboard");
  }
  
  // Check if user is owner or admin
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', user.id)
    .single();
  
  if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
    redirect("/dashboard");
  }
  
  return (
    <div className="page-shell">
      <PageHeader
        title="Členovia workspace"
        description="Pozvánky, členstvo a základné roly tímu."
        icon={UsersRound}
      />
      <section className="surface-panel p-5">
        <WorkspaceMembers workspaceId={params.workspaceId} />
      </section>
    </div>
  );
}
