import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServerUser } from "@/lib/auth";
import { createClient as createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { description, url: urlFromBody } = body;

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Popis bugu je povinný" },
        { status: 400 }
      );
    }

    // Create Supabase client with request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Cookies are handled by middleware
          },
        },
      }
    );

    // Verify user is authenticated via Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error("Auth error in bug report:", authError);
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      );
    }

    // Ensure user_id matches authenticated user
    if (user.id !== authUser.id) {
      console.error("User ID mismatch:", { serverUser: user.id, authUser: authUser.id });
      return NextResponse.json(
        { success: false, error: "User ID mismatch" },
        { status: 403 }
      );
    }

    // Get current URL - prefer URL from request body, fallback to referer or pathname
    const referer = request.headers.get("referer");
    const url = urlFromBody || referer || new URL(request.url).pathname || "unknown";

    console.log("Bug report data:", {
      user_id: authUser.id,
      auth_uid: authUser.id,
      description: description.trim(),
      url: url,
      urlFromBody,
      referer,
    });

    // Try direct insert first (should work with RLS policy)
    const { data: directData, error: directError } = await supabase
      .from("bugs")
      .insert({
        user_id: authUser.id,
        description: description.trim(),
        url: url,
      })
      .select()
      .single();
    
    if (directError) {
      console.error("Direct insert failed:", directError);
      console.error("Direct insert error details:", {
        message: directError.message,
        details: directError.details,
        hint: directError.hint,
        code: directError.code,
      });
      
      // If direct insert fails, try RPC function as fallback
      console.log("Trying RPC insert as fallback...");
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('insert_bug_report', {
          p_description: description.trim(),
          p_url: url,
        });
      
      if (rpcError) {
        console.error("RPC insert also failed:", rpcError);
        throw directError; // Throw the original error
      }
      
      console.log("Bug report inserted via RPC successfully:", rpcData);
      return NextResponse.json(
        { success: true, data: Array.isArray(rpcData) ? rpcData[0] : rpcData },
        { status: 201 }
      );
    }

    console.log("Bug report inserted successfully via direct insert:", directData);

    return NextResponse.json(
      { success: true, data: directData },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in bug report endpoint:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    // Create Supabase client with request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Cookies are handled by middleware
          },
        },
      }
    );

    // Check if user is superadmin via JWT claim or email
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check JWT claim for superadmin
    const appRole = authUser.app_metadata?.app_role;
    const isSuperadmin = appRole === "superadmin" || 
                        authUser.email === "design@renemoravec.sk" || 
                        authUser.email === "rene@renemoravec.sk";

    if (!isSuperadmin) {
      return NextResponse.json(
        { success: false, error: "Iba superadmin môže vidieť bug reporty" },
        { status: 403 }
      );
    }

    console.log("Fetching bugs for superadmin:", authUser.email);

    // Use service client to bypass RLS for superadmin
    // This ensures superadmin can see all bugs even if RLS policy has issues
    const serviceClient = createServiceClient();
    const clientToUse = serviceClient || supabase;

    // Get all bugs
    const { data: bugs, error: bugsError } = await clientToUse
      .from("bugs")
      .select("*")
      .order("created_at", { ascending: false });

    if (bugsError) {
      console.error("Error fetching bugs:", bugsError);
      console.error("Bugs error details:", {
        message: bugsError.message,
        details: bugsError.details,
        hint: bugsError.hint,
        code: bugsError.code,
      });
      return NextResponse.json(
        { success: false, error: bugsError.message },
        { status: 400 }
      );
    }

    console.log("Bugs fetched:", bugs?.length || 0, "bugs found");

    // Get user IDs from bugs
    const userIds = bugs?.map(bug => bug.user_id).filter(Boolean) || [];
    
    // Get profiles for users (use same client as bugs query)
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await clientToUse
        .from("profiles")
        .select("id, email, display_name, first_name, last_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Continue without profiles if error
      } else {
        profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      }
    }

    // Get all workspaces to check user roles
    const { data: workspaces, error: workspacesError } = await clientToUse
      .from("workspaces")
      .select("id, owner_id");

    if (workspacesError) {
      console.error("Error fetching workspaces:", workspacesError);
    }

    // Get workspace members for all workspaces
    const { data: workspaceMembers, error: membersError } = await clientToUse
      .from("workspace_members")
      .select("workspace_id, user_id, role");

    if (membersError) {
      console.error("Error fetching workspace members:", membersError);
    }

    // Create maps for quick lookup
    const ownerMap = new Map<string, Set<string>>(); // workspace_id -> Set of user_ids
    const memberMap = new Map<string, Map<string, string>>(); // workspace_id -> Map(user_id -> role)

    workspaces?.forEach(ws => {
      if (!ownerMap.has(ws.id)) {
        ownerMap.set(ws.id, new Set());
      }
      ownerMap.get(ws.id)!.add(ws.owner_id);
    });

    workspaceMembers?.forEach(member => {
      if (!memberMap.has(member.workspace_id)) {
        memberMap.set(member.workspace_id, new Map());
      }
      memberMap.get(member.workspace_id)!.set(member.user_id, member.role);
    });

    // Determine user role (owner or member) - check all workspaces
    const getUserRole = (userId: string): "owner" | "member" | null => {
      // Check if user is owner of any workspace
      for (const [workspaceId, ownerIds] of Array.from(ownerMap.entries())) {
        if (ownerIds.has(userId)) {
          return "owner";
        }
      }
      
      // Check if user is member of any workspace
      for (const [workspaceId, members] of Array.from(memberMap.entries())) {
        if (members.has(userId)) {
          const role = members.get(userId);
          if (role === "owner") {
            return "owner";
          }
          return "member";
        }
      }
      
      return null;
    };

    // Combine bugs with profiles and user roles
    const bugsWithProfiles = bugs?.map(bug => {
      const profile = profilesMap.get(bug.user_id) || null;
      const userRole = getUserRole(bug.user_id);
      
      return {
        ...bug,
        user: profile ? {
          ...profile,
          role: userRole,
        } : null,
      };
    }) || [];

    return NextResponse.json(
      { success: true, data: bugsWithProfiles },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in bug report GET endpoint:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

