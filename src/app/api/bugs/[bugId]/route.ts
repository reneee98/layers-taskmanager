import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServerUser } from "@/lib/auth";
import { createClient as createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { bugId: string } }
) {
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

    // Verify user is authenticated via Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error("Auth error in bug update:", authError);
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      );
    }

    // Check if user is superadmin
    const appRole = authUser.app_metadata?.app_role;
    const isSuperadmin = appRole === "superadmin" || 
                        authUser.email === "design@renemoravec.sk" || 
                        authUser.email === "rene@renemoravec.sk";

    if (!isSuperadmin) {
      return NextResponse.json(
        { success: false, error: "Iba superadmin môže upravovať bug reporty" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { is_resolved } = body;

    if (typeof is_resolved !== "boolean") {
      return NextResponse.json(
        { success: false, error: "is_resolved musí byť boolean" },
        { status: 400 }
      );
    }

    const { bugId } = params;

    // Use service client to bypass RLS for superadmin
    const serviceClient = createServiceClient();
    const clientToUse = serviceClient || supabase;

    // Update bug report
    const { data, error } = await clientToUse
      .from("bugs")
      .update({ is_resolved })
      .eq("id", bugId)
      .select()
      .single();

    if (error) {
      console.error("Error updating bug report:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in bug report PATCH endpoint:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { bugId: string } }
) {
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

    // Verify user is authenticated via Supabase
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error("Auth error in bug delete:", authError);
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      );
    }

    // Check if user is superadmin
    const appRole = authUser.app_metadata?.app_role;
    const isSuperadmin = appRole === "superadmin" || 
                        authUser.email === "design@renemoravec.sk" || 
                        authUser.email === "rene@renemoravec.sk";

    if (!isSuperadmin) {
      return NextResponse.json(
        { success: false, error: "Iba superadmin môže mazať bug reporty" },
        { status: 403 }
      );
    }

    const { bugId } = params;

    // Use service client to bypass RLS for superadmin
    const serviceClient = createServiceClient();
    const clientToUse = serviceClient || supabase;

    // Delete bug report
    const { error } = await clientToUse
      .from("bugs")
      .delete()
      .eq("id", bugId);

    if (error) {
      console.error("Error deleting bug report:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in bug report DELETE endpoint:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

