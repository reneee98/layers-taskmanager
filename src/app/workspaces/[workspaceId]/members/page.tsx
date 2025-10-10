import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { WorkspaceMembers } from "@/components/workspace/WorkspaceMembers";

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
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Správa členov</h1>
        <p className="text-muted-foreground mt-2">
          Spravujte členov vášho workspace
        </p>
      </div>
      
      <WorkspaceMembers workspaceId={params.workspaceId} />
    </div>
  );
}
