import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createChecklistItemSchema = z.object({
  text: z.string().min(1, "Text je povinný"),
  position: z.number().optional().default(0),
});

// GET - Fetch all checklist items for a task
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // RLS policies will handle access control

    const { data, error } = await supabase
      .from("task_checklist_items")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching checklist items:", error);
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
    console.error("Error in GET checklist:", error);
    return NextResponse.json({ error: "Internal server error" }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST - Create a new checklist item
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createChecklistItemSchema.parse(body);

    // Get the next position for this task
    const { data: existingItems } = await supabase
      .from("task_checklist_items")
      .select("position")
      .eq("task_id", taskId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = existingItems && existingItems.length > 0 
      ? (existingItems[0].position || 0) + 1 
      : 0;

    // RLS policies will handle access control

    const { data, error } = await supabase
      .from("task_checklist_items")
      .insert({
        task_id: taskId,
        text: validatedData.text,
        position: validatedData.position || nextPosition,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating checklist item:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST checklist:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
