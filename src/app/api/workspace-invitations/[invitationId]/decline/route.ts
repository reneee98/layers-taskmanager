import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    const { data: invitation, error: invitationError } = await supabase
      .from("workspace_invitations")
      .select("id")
      .eq("id", params.invitationId)
      .eq("email", user.email)
      .eq("status", "pending")
      .maybeSingle();

    if (invitationError) {
      console.error("Error loading invitation for decline:", invitationError);
      return NextResponse.json(
        { success: false, error: "Failed to load invitation" },
        { status: 500 }
      );
    }

    if (!invitation) {
      return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 });
    }

    const { error: declineError } = await supabase
      .from("workspace_invitations")
      .update({ status: "declined" })
      .eq("id", params.invitationId);

    if (declineError) {
      console.error("Error declining workspace invitation:", declineError);
      return NextResponse.json(
        { success: false, error: "Failed to decline invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Invitation declined" });
  } catch (error) {
    console.error("Error in workspace invitation decline endpoint:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
