import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createGoogleDriveLinkSchema = z.object({
  url: z.string().url("Neplatná URL adresa"),
  description: z.string().optional().nullable(),
});

const updateGoogleDriveLinkSchema = z.object({
  url: z.string().url("Neplatná URL adresa").optional(),
  description: z.string().optional().nullable(),
});

// GET - Fetch all Google Drive links for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: links, error } = await supabase
      .from("google_drive_links")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching Google Drive links:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch links" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error("Error in GET /api/tasks/[taskId]/google-drive-links:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new Google Drive link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createGoogleDriveLinkSchema.parse(body);

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

    const { data: newLink, error } = await supabase
      .from("google_drive_links")
      .insert({
        task_id: taskId,
        url: validatedData.url,
        description: validatedData.description,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating Google Drive link:", error);
      return NextResponse.json({ success: false, error: "Failed to create link" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newLink });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error in POST /api/tasks/[taskId]/google-drive-links:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
