import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { costItemUpdateSchema } from "@/lib/validations/cost-item";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ costId: string }> }
) {
  try {
    const { costId: id } = await params;
    const supabase = createClient();

    const { data, error } = await supabase
      .from("cost_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ costId: string }> }
) {
  try {
    const { costId: id } = await params;
    const supabase = createClient();
    const body = await req.json();

    // Validate input
    const validatedData = costItemUpdateSchema.parse(body);

    // Get existing cost item
    const { data: existing, error: fetchError } = await supabase
      .from("cost_items")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Cost item nebola nájdená" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.category !== undefined) updateData.category = validatedData.category || null;
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
    if (validatedData.date !== undefined) updateData.date = validatedData.date;
    if (validatedData.is_billable !== undefined) updateData.is_billable = validatedData.is_billable;
    if (validatedData.task_id !== undefined) updateData.task_id = validatedData.task_id || null;

    // Recalculate total if amount changed
    if (updateData.amount !== undefined) {
      updateData.total = updateData.amount;
    }

    // Update cost item
    const { data: updated, error: updateError } = await supabase
      .from("cost_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Get updated finance snapshot
    const { data: financeSnapshot, error: financeError } = await supabase
      .from("project_finance_view")
      .select("*")
      .eq("project_id", existing.project_id)
      .single();

    if (financeError) {
      console.warn("Failed to get finance snapshot:", financeError);
    }

    return NextResponse.json({
      success: true,
      data: {
        costItem: updated,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ costId: string }> }
) {
  try {
    const { costId: id } = await params;
    const supabase = createClient();

    // Get cost item before deletion (need project_id for finance snapshot)
    const { data: existing, error: fetchError } = await supabase
      .from("cost_items")
      .select("project_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "Cost item nebola nájdená" },
        { status: 404 }
      );
    }

    const projectId = existing.project_id;

    // Delete cost item
    const { error: deleteError } = await supabase
      .from("cost_items")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    // Get updated finance snapshot
    const { data: financeSnapshot, error: financeError } = await supabase
      .from("project_finance_view")
      .select("*")
      .eq("project_id", projectId)
      .single();

    if (financeError) {
      console.warn("Failed to get finance snapshot:", financeError);
    }

    return NextResponse.json({
      success: true,
      data: { financeSnapshot },
    });
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

