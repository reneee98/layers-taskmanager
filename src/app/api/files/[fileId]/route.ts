import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get file record first
    const { data: fileRecord, error: fetchError } = await supabase
      .from("task_files")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if user owns the file
    if (fileRecord.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from("task-files")
      .remove([fileRecord.file_path]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete file record from database
    const { error: dbError } = await supabase
      .from("task_files")
      .delete()
      .eq("id", params.id);

    if (dbError) {
      console.error("Error deleting file record:", dbError);
      return NextResponse.json({ error: "Failed to delete file record" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/files/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
