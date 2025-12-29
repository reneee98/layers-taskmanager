import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { permissions, workspaceId } = body;
    
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid permissions array" }, { status: 400 });
    }
    
    // Check all permissions in parallel
    const permissionChecks = permissions.map(async (perm: { resource: string; action: string }) => {
      const hasPerm = await hasPermission(
        user.id,
        perm.resource,
        perm.action,
        workspaceId || undefined
      );
      return {
        resource: perm.resource,
        action: perm.action,
        hasPermission: hasPerm
      };
    });
    
    const results = await Promise.all(permissionChecks);
    
    // Convert to map for easy lookup
    const permissionMap: Record<string, boolean> = {};
    results.forEach(result => {
      const key = `${result.resource}.${result.action}`;
      permissionMap[key] = result.hasPermission;
    });
    
    return NextResponse.json({ 
      success: true, 
      permissions: permissionMap 
    });
  } catch (error) {
    console.error("Error in check-permissions-batch:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}







