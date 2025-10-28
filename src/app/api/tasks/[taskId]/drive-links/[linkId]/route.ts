import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateLinkSchema = z.object({
  url: z.string().min(1, "URL je povinná").refine(
    (url) => {
      // More flexible URL validation - allow various formats
      try {
        // If it doesn't start with protocol, try adding https://
        let testUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          testUrl = 'https://' + url;
        }
        
        const urlObj = new URL(testUrl);
        return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
      } catch {
        return false;
      }
    },
    "Neplatná URL adresa"
  ).optional(),
  description: z.string().optional().nullable().transform(val => val === "" ? null : val),
});

// PUT - Update a Google Drive link
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ taskId: string; linkId: string }> }
) {
  try {
    const { taskId, linkId } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateLinkSchema.parse(body);

    const { data, error } = await supabase
      .from("google_drive_links")
      .update(validatedData)
      .eq("id", linkId)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error in PUT drive-links:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a Google Drive link
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ taskId: string; linkId: string }> }
) {
  try {
    const { taskId, linkId } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("google_drive_links")
      .delete()
      .eq("id", linkId)
      .eq("task_id", taskId);

    if (error) {
      console.error("Error deleting link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE drive-links:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

