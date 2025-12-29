import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createLinkSchema = z.object({
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

// GET - Fetch all links for a project
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from("project_quick_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching links:", error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return NextResponse.json({ data: data || [] }, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error in GET project links:", error);
    return NextResponse.json({ error: "Internal server error" }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST - Create a new link
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createLinkSchema.parse(body);

    const { data, error } = await supabase
      .from("project_quick_links")
      .insert({
        project_id: projectId,
        url: validatedData.url.startsWith('http') ? validatedData.url : 'https://' + validatedData.url,
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
    console.error("Error in POST project links:", error);
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

