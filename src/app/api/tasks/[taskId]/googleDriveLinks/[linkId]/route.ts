import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateGoogleDriveLinkSchema = z.object({
  url: z.string().url("Neplatná URL adresa").optional(),
  description: z.string().optional().nullable(),
});

// PUT - Update a Google Drive link
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; linkId: string }> }
) {
  try {
    const { taskId, linkId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateGoogleDriveLinkSchema.parse(body);

    // Verify user has access to the task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        project:projects!inner(
          id,
          workspace_id,
          workspace_members!inner(
            user_id
          )
        )
      `)
      .eq("id", taskId)
      .eq("project.workspace_members.user_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Task not found or access denied" }, { status: 404 });
    }

    const { data: updatedLink, error } = await supabase
      .from("google_drive_links")
      .update({
        url: validatedData.url,
        description: validatedData.description,
      })
      .eq("id", linkId)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating Google Drive link:", error);
      return NextResponse.json({ success: false, error: "Failed to update link" }, { status: 500 });
    }

    if (!updatedLink) {
      return NextResponse.json({ success: false, error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedLink });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error in PUT /api/tasks/[taskId]/google-drive-links/[linkId]:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a Google Drive link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; linkId: string }> }
) {
  try {
    const { taskId, linkId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to the task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        project:projects!inner(
          id,
          workspace_id,
          workspace_members!inner(
            user_id
          )
        )
      `)
      .eq("id", taskId)
      .eq("project.workspace_members.user_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Task not found or access denied" }, { status: 404 });
    }

    const { error } = await supabase
      .from("google_drive_links")
      .delete()
      .eq("id", linkId)
      .eq("task_id", taskId);

    if (error) {
      console.error("Error deleting Google Drive link:", error);
      return NextResponse.json({ success: false, error: "Failed to delete link" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/tasks/[taskId]/google-drive-links/[linkId]:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
