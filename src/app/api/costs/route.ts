import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { costItemSchema } from "@/lib/validations/cost-item";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export async function GET(req: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(req);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const taskId = searchParams.get("task_id");

    let query = supabase
      .from("cost_items")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("date", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    
    if (taskId) {
      query = query.eq("task_id", taskId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(req);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const supabase = createClient();
    const body = await req.json();

    // Validate input
    const validatedData = costItemSchema.parse(body);

    // Insert cost item
    const { data: costItem, error: insertError } = await supabase
      .from("cost_items")
      .insert({
        project_id: validatedData.project_id,
        task_id: validatedData.task_id || null,
        name: validatedData.name,
        description: validatedData.description || null,
        category: validatedData.category || null,
        amount: validatedData.amount,
        date: validatedData.date,
        is_billable: validatedData.is_billable ?? true,
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // Get updated project finance snapshot
    const { data: financeSnapshot, error: financeError } = await supabase
      .from("project_finance_view")
      .select("*")
      .eq("project_id", validatedData.project_id)
      .single();

    if (financeError) {
      console.warn("Failed to get finance snapshot:", financeError);
    }

    return NextResponse.json({
      success: true,
      data: {
        costItem,
        financeSnapshot,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}

