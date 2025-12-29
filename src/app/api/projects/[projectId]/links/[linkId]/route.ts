import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateLinkSchema = z.object({
  url: z.string().min(1, "URL je povinná").refine(
    (url) => {
      try {
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
  ),
  description: z.string().optional().nullable().transform(val => val === "" ? null : val),
});

// PUT - Update a link
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; linkId: string }> }
) {
  try {
    const { projectId, linkId } = await context.params;
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateLinkSchema.parse(body);

    const { data, error } = await supabase
      .from("project_quick_links")
      .update({
        url: validatedData.url.startsWith('http') ? validatedData.url : 'https://' + validatedData.url,
        description: validatedData.description,
      })
      .eq("id", linkId)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error) {
      console.error("Error updating link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error in PUT project link:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validation failed", 
        validation: error.errors,
        code: "VALIDATION_ERROR"
      }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a link
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; linkId: string }> }
) {
  try {
    const { projectId, linkId } = await context.params;
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("project_quick_links")
      .delete()
      .eq("id", linkId)
      .eq("project_id", projectId);

    if (error) {
      console.error("Error deleting link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE project link:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

