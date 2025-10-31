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
    const allWorkspaces = await getUserAccessibleWorkspaces(user.id);
    
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

      // Automaticky vytvor osobný projekt "Osobné úlohy"
      const personalProjectCode = `PERSONAL-${newWorkspace.id.substring(0, 8).toUpperCase()}`;
      const { data: personalProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          workspace_id: newWorkspace.id,
          name: 'Osobné úlohy',
          code: personalProjectCode,
          description: 'Projekt pre osobné úlohy bez klienta',
          status: 'active',
          client_id: null,
          created_by: user.id
        })
        .select('id, name, code')
        .single();

      if (projectError) {
        console.error("Error creating personal project:", projectError);
        // Necháme to pokračovať, pretože workspace bol vytvorený
      }
      
      allWorkspaces.push({
        ...newWorkspace,
        role: 'owner'
      });
    }
    
    // SECURITY FIX: Allow users to see workspaces they have access to (as owner or member)
    const filteredWorkspaces = allWorkspaces.filter(() => true);
    
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
