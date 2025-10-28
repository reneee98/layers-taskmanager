import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createLinkSchema = z.object({
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
  ),
  description: z.string().optional().nullable().transform(val => val === "" ? null : val),
});

// GET - Fetch all Google Drive links for a task
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("google_drive_links")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching links:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (error) {
    console.error("Error in GET drive-links:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new Google Drive link
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User ID:", user.id);
    console.log("Task ID:", taskId);

    const body = await request.json();
    console.log("Request body:", body);
    
    const validatedData = createLinkSchema.parse(body);
    console.log("Validated data:", validatedData);

    // Skip workspace verification for now - RLS will handle it
    console.log("Skipping workspace verification - relying on RLS");

    const { data, error } = await supabase
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
      console.error("Error creating link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST drive-links:", error);
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      return NextResponse.json({ 
        error: "Validation failed", 
        validation: error.errors,
        code: "VALIDATION_ERROR"
      }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

