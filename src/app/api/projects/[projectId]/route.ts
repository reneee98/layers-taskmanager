import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProjectSchema } from "@/lib/validations/project";
import { validateSchema } from "@/lib/zod-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = createClient();

    const { data: project, error } = await supabase
      .from("projects")
      .select("*, client:clients(*)")
      .eq("id", projectId)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    // Convert hourly_rate_cents and budget_cents back to hourly_rate and fixed_fee for frontend compatibility
    const projectWithHourlyRate = {
      ...project,
      hourly_rate: project.hourly_rate_cents ? project.hourly_rate_cents / 100 : null,
      fixed_fee: project.budget_cents ? project.budget_cents / 100 : null
    };

    return NextResponse.json({ success: true, data: projectWithHourlyRate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    console.log(">>> PATCH /api/projects - Body received:", JSON.stringify(body, null, 2));
    
    const validation = validateSchema(updateProjectSchema, body);
    console.log(">>> PATCH /api/projects - Validation result:", JSON.stringify(validation, null, 2));

    if (!validation.success) {
      console.error("[DEBUG] PATCH /api/projects - Validation FAILED");
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    // Check if code is unique (if being updated)
    if (validation.data.code) {
      const { data: existing } = await supabase
        .from("projects")
        .select("id")
        .eq("code", validation.data.code)
        .neq("id", projectId)
        .single();

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Kód projektu už existuje" },
          { status: 400 }
        );
      }
    }

    // Convert hourly_rate to hourly_rate_cents and fixed_fee to budget_cents if provided
    const updateData = { ...validation.data };
    if (updateData.hourly_rate !== undefined) {
      updateData.hourly_rate_cents = updateData.hourly_rate ? Math.round(updateData.hourly_rate * 100) : null;
      delete updateData.hourly_rate;
    }
    if (updateData.fixed_fee !== undefined) {
      updateData.budget_cents = updateData.fixed_fee ? Math.round(updateData.fixed_fee * 100) : null;
      delete updateData.fixed_fee;
    }

    console.log(">>> PATCH /api/projects - Updating with data:", JSON.stringify(updateData, null, 2));
    
    const { data: project, error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId)
      .select("*, client:clients(*)")
      .single();

    if (error) {
      console.error(">>> PATCH /api/projects - Database error:", error.message);
      console.error(">>> PATCH /api/projects - Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // Convert hourly_rate_cents and budget_cents back to hourly_rate and fixed_fee for frontend compatibility
    const projectWithHourlyRate = {
      ...project,
      hourly_rate: project.hourly_rate_cents ? project.hourly_rate_cents / 100 : null,
      fixed_fee: project.budget_cents ? project.budget_cents / 100 : null
    };

    return NextResponse.json({ success: true, data: projectWithHourlyRate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = createClient();

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

