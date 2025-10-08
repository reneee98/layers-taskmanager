import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createFileSchema = z.object({
  filename: z.string().min(1, "Názov súboru je povinný"),
  original_filename: z.string().min(1, "Pôvodný názov súboru je povinný"),
  file_size: z.number().min(1, "Veľkosť súboru musí byť väčšia ako 0"),
  mime_type: z.string().min(1, "MIME typ je povinný"),
  file_path: z.string().min(1, "Cesta k súboru je povinná"),
  description: z.string().optional(),
});

export async function GET(
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

    const { data: files, error } = await supabase
      .from("task_files")
      .select("*")
      .eq("task_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching files:", error);
      return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
    }

    // Add computed fields
    const filesWithComputed = files?.map(file => ({
      ...file,
      file_extension: file.original_filename.split('.').pop()?.toLowerCase() || '',
      formatted_size: formatFileSize(file.file_size),
    })) || [];

    return NextResponse.json({ data: filesWithComputed });
  } catch (error) {
    console.error("Error in GET /api/tasks/[taskId]/files:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    const body = await request.json();
    const validatedData = createFileSchema.parse(body);

    const { data: file, error } = await supabase
      .from("task_files")
      .insert({
        task_id: params.id,
        user_id: user.id,
        filename: validatedData.filename,
        original_filename: validatedData.original_filename,
        file_size: validatedData.file_size,
        mime_type: validatedData.mime_type,
        file_path: validatedData.file_path,
        description: validatedData.description,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating file record:", error);
      return NextResponse.json({ error: "Failed to create file record" }, { status: 500 });
    }

    // Add computed fields
    const fileWithComputed = {
      ...file,
      file_extension: file.original_filename.split('.').pop()?.toLowerCase() || '',
      formatted_size: formatFileSize(file.file_size),
    };

    return NextResponse.json({ data: fileWithComputed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Error in POST /api/tasks/[taskId]/files:", error);
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
