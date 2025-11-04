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
    
    const validation = validateSchema(updateProjectSchema, body);

    if (!validation.success) {
      return NextResponse.json(validation, { status: 400 });
    }

    const supabase = createClient();

    // Check if this is a personal project
    const { data: existingProject, error: projectError } = await supabase
      .from("projects")
      .select("name, code")
      .eq("id", projectId)
      .single();

    if (projectError || !existingProject) {
      return NextResponse.json({ success: false, error: "Projekt nebol nájdený" }, { status: 404 });
    }

    const isPersonalProject = existingProject.name === "Osobné úlohy" || 
                              (existingProject.code && (existingProject.code === "PERSONAL" || existingProject.code.startsWith("PERSONAL-"))) ||
                              !existingProject.code;

    // Prevent status change for personal project
    if (isPersonalProject && validation.data.status !== undefined) {
      return NextResponse.json(
        { success: false, error: "Nie je možné meniť status osobného projektu" },
        { status: 400 }
      );
    }

    // Prevent client assignment for personal project
    if (isPersonalProject && validation.data.client_id !== undefined && validation.data.client_id !== null) {
      return NextResponse.json(
        { success: false, error: "Osobný projekt nemôže mať klienta" },
        { status: 400 }
      );
    }

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
    
    const { data: project, error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", projectId)
      .select("*, client:clients(*)")
      .single();

    if (error) {
      console.error("Failed to update project:", error.message);
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

    // Check if this is a personal project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, code")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: "Projekt nebol nájdený" }, { status: 404 });
    }

    const isPersonalProject = project.name === "Osobné úlohy" || 
                              (project.code && (project.code === "PERSONAL" || project.code.startsWith("PERSONAL-"))) ||
                              !project.code;

    // Prevent deletion of personal project
    if (isPersonalProject) {
      return NextResponse.json(
        { success: false, error: "Nie je možné odstrániť osobný projekt" },
        { status: 400 }
      );
    }

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

