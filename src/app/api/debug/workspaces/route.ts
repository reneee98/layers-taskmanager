import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const serviceClient = createServiceClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated",
        authError: authError?.message
      }, { status: 401 });
    }

    const debugInfo: any = {
      userId: user.id,
      userEmail: user.email,
      serviceClientAvailable: !!serviceClient,
      serviceKeyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      warning: serviceClient ? null : "CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not configured. Member workspaces cannot be fetched due to RLS. Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables.",
    };

    // Check owned workspaces
    const ownedQuery = serviceClient || supabase;
    const { data: ownedWorkspaces, error: ownedError } = await ownedQuery
      .from('workspaces')
      .select('id, name, description, owner_id, created_at')
      .eq('owner_id', user.id);

    debugInfo.ownedWorkspaces = {
      count: ownedWorkspaces?.length || 0,
      data: ownedWorkspaces || null,
      error: ownedError?.message || null
    };

    // Check workspace_members
    if (serviceClient) {
      const { data: members, error: membersError } = await serviceClient
        .from('workspace_members')
        .select('workspace_id, role, user_id')
        .eq('user_id', user.id);

      debugInfo.workspaceMembers = {
        count: members?.length || 0,
        data: members || null,
        error: membersError?.message || null
      };

      // Check specific Layers workspace membership
      const layersWorkspaceId = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';
      const { data: layersMember, error: layersMemberError } = await serviceClient
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', layersWorkspaceId)
        .eq('user_id', user.id)
        .single();

      debugInfo.layersWorkspaceMembership = {
        exists: !!layersMember,
        data: layersMember || null,
        error: layersMemberError?.message || null,
        workspaceId: layersWorkspaceId
      };

      // Fetch Layers workspace details
      const { data: layersWorkspace, error: layersWorkspaceError } = await serviceClient
        .from('workspaces')
        .select('id, name, description, owner_id, created_at')
        .eq('id', layersWorkspaceId)
        .single();

      debugInfo.layersWorkspace = {
        exists: !!layersWorkspace,
        data: layersWorkspace || null,
        error: layersWorkspaceError?.message || null
      };
    }

    // Test getUserAccessibleWorkspaces
    const { getUserAccessibleWorkspaces } = await import('@/lib/auth/workspace-security');
    const allWorkspaces = await getUserAccessibleWorkspaces(user.id);

    debugInfo.getUserAccessibleWorkspacesResult = {
      count: allWorkspaces.length,
      workspaces: allWorkspaces.map(w => ({
        id: w.id,
        name: w.name,
        role: w.role,
        owner_id: w.owner_id
      }))
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo
    });
  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

