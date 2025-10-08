import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const uploadFileSchema = z.object({
  task_id: z.string().uuid("Neplatné ID úlohy"),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user with cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const taskId = formData.get("task_id") as string;
    const description = formData.get("description") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate task_id
    const validatedData = uploadFileSchema.parse({ task_id: taskId, description });

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || '';
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `${taskId}/${uniqueFilename}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("task-files")
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from("task_files")
      .insert({
        task_id: validatedData.task_id,
        user_id: user.id,
        filename: uniqueFilename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_path: filePath,
        description: validatedData.description,
      })
      .select("*")
      .single();

    if (dbError) {
      console.error("Error creating file record:", dbError);
      // Try to clean up uploaded file
      await supabase.storage.from("task-files").remove([filePath]);
      return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
    }

    // Get user profile manually
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("id, name, email")
      .eq("id", user.id)
      .single();

    // Add computed fields
    const fileWithComputed = {
      ...fileRecord,
      file_extension: fileExtension,
      formatted_size: formatFileSize(file.size),
      user: userProfile,
    };

    return NextResponse.json({ data: fileWithComputed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error in POST /api/files/upload:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
