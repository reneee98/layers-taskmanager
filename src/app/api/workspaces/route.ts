import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { getUserAccessibleWorkspaces } from "@/lib/auth/workspace-security";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const supabase = createClient();
    
    // Use the new security function to get accessible workspaces
    console.log(`=== API /api/workspaces START ===`);
    console.log(`User: ${user.email} (${user.id})`);
    const allWorkspaces = await getUserAccessibleWorkspaces(user.id);
    
    console.log(`=== API /api/workspaces RESULT ===`);
    console.log(`Total workspaces returned: ${allWorkspaces.length}`);
    console.log(`Workspace names:`, allWorkspaces.map(w => w.name));
    console.log(`Workspace details:`, allWorkspaces.map(w => ({ id: w.id, name: w.name, role: w.role })));
    
    // If no workspaces exist, create one
    if (allWorkspaces.length === 0) {
      const workspaceName = `${user.email?.split('@')[0] || 'User'}'s Workspace`;
      const workspaceDescription = 'Môj workspace';
      
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          description: workspaceDescription,
          owner_id: user.id
        })
        .select('id, name, description, owner_id, created_at')
        .single();
      
      if (createError) {
        console.error("Error creating workspace:", createError);
        return NextResponse.json({ success: false, error: "Failed to create workspace" }, { status: 500 });
      }

      // Automaticky pridaj ownera do workspace_members tabuľky
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: newWorkspace.id,
          user_id: user.id,
          role: 'owner',
          created_at: newWorkspace.created_at
        });

      if (memberError) {
        console.error("Error adding owner to workspace_members:", memberError);
        // Necháme to pokračovať, pretože workspace bol vytvorený
      }
      
      allWorkspaces.push({
        ...newWorkspace,
        role: 'owner'
      });
    }
    
    // SECURITY FIX: Allow users to see workspaces they have access to (as owner or member)
    const filteredWorkspaces = allWorkspaces.filter(workspace => {
      // Allow all workspaces that user has access to (already filtered by getUserAccessibleWorkspaces)
      console.log(`SECURITY: Allowing workspace ${workspace.name} for user ${user.email} - role: ${workspace.role}`);
      return true;
    });
    
    console.log(`DEBUG: Final workspaces for user ${user.email}:`, filteredWorkspaces);
    return NextResponse.json({ success: true, data: filteredWorkspaces });
  } catch (error) {
    console.error("Error in workspaces GET:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // DISABLED: Vytváranie nových workspace-ov je vypnuté
  return NextResponse.json({ 
    success: false, 
    error: "Vytváranie nových workspace-ov je dočasne vypnuté" 
  }, { status: 403 });
}
