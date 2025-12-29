import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ hasPermission: false }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const action = searchParams.get('action');
    const workspaceId = searchParams.get('workspace_id');
    
    if (!resource || !action) {
      return NextResponse.json({ hasPermission: false }, { status: 400 });
    }
    
    const hasPerm = await hasPermission(
      user.id,
      resource,
      action,
      workspaceId || undefined
    );
    
    return NextResponse.json({ hasPermission: hasPerm });
  } catch (error) {
    console.error("Error in check-permission:", error);
    return NextResponse.json({ hasPermission: false }, { status: 500 });
  }
}

