import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Verify task access
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    // List files in the task folder
    console.log("API: Listing files for taskId:", taskId);
    const { data: files, error: listError } = await supabase.storage
      .from("task-files")
      .list(taskId, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" }
      });

    console.log("API: Storage list result - files:", files, "error:", listError);
    console.log("API: Files count:", files?.length || 0);

    if (listError) {
      console.error("List files error:", listError);
      return NextResponse.json({ success: false, error: "Nepodarilo sa načítať súbory" }, { status: 500 });
    }

    // If files is null or undefined, return empty array
    if (!files) {
      console.log("API: Files is null/undefined, returning empty array");
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get signed URLs for each file (valid for 1 hour)
    console.log("API: Processing", files.length, "files");
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        console.log("API: Processing file:", file.name, "metadata:", file.metadata);
        const filePath = `${taskId}/${file.name}`;
        const { data: urlData, error: urlError } = await supabase.storage
          .from("task-files")
          .createSignedUrl(filePath, 3600); // 1 hour

        if (urlError) {
          console.error("Signed URL error for", file.name, ":", urlError);
          // Fallback to public URL
          const { data: publicUrlData } = supabase.storage
            .from("task-files")
            .getPublicUrl(filePath);
          
          const fileData = {
            name: file.name,
            url: publicUrlData.publicUrl,
            size: file.metadata?.size || 0,
            type: file.metadata?.mimetype || "application/octet-stream",
            createdAt: file.created_at
          };
          console.log("API: File data (public URL):", fileData);
          return fileData;
        }

        const fileData = {
          name: file.name,
          url: urlData.signedUrl,
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || "application/octet-stream",
          createdAt: file.created_at
        };
        console.log("API: File data (signed URL):", fileData);
        return fileData;
      })
    );

    console.log("API: Returning", filesWithUrls.length, "files with URLs");
    return NextResponse.json({
      success: true,
      data: filesWithUrls
    });

  } catch (error) {
    console.error("Files fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Nie ste prihlásený" }, { status: 401 });
    }

    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Verify task access
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ success: false, error: "Úloha nebola nájdená" }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: "Súbor nebol nájdený" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `${taskId}/${fileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("task-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ success: false, error: "Nepodarilo sa nahrať súbor" }, { status: 500 });
    }

    // Update task's updated_at timestamp to trigger realtime updates
    await supabase
      .from("tasks")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("workspace_id", workspaceId);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("task-files")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        filePath: filePath,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type
      }
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}