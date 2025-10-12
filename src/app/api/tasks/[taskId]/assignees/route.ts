import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getUserWorkspaceIdFromRequest } from "@/lib/auth/workspace";

export const dynamic = "force-dynamic";

const assigneesSchema = z.object({
  assigneeIds: z.array(z.string().uuid()),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const { taskId } = await params;
    const supabase = createClient();

    // First verify the task belongs to the user's workspace
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    const { data: assignees, error } = await supabase
      .from("task_assignees")
      .select("*")
      .eq("task_id", taskId)
      .eq("workspace_id", workspaceId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch task assignees:", error);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa načítať priradených používateľov" },
        { status: 500 }
      );
    }

    // Fetch users separately from profiles table
    const userIds = assignees?.map(a => a.user_id) || [];
    let users: any[] = [];
    
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("user_profiles")
        .select("*")
        .in("id", userIds);
      
      if (usersError) {
        console.error("Failed to fetch users:", usersError);
        return NextResponse.json(
          { success: false, error: "Nepodarilo sa načítať používateľov" },
          { status: 500 }
        );
      }
      
      users = usersData || [];
    }

    // Combine assignees with user data
    const assigneesWithUsers = assignees?.map(assignee => {
      const user = users.find(u => u.id === assignee.user_id);
      console.log("Assigning user to assignee:", {
        assignee_user_id: assignee.user_id,
        found_user: user,
        all_users: users
      });
      return {
        ...assignee,
        user: user
      };
    }) || [];

    console.log("Final assignees with users:", assigneesWithUsers);

    return NextResponse.json({ success: true, data: assigneesWithUsers });
  } catch (error) {
    console.error("Error in task assignees API:", error);
    return NextResponse.json(
      { success: false, error: "Vnútorná chyba servera" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Get user's workspace ID
    const workspaceId = await getUserWorkspaceIdFromRequest(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    
    const { taskId } = await params;
    const supabase = createClient();
    const body = await request.json();
    
    const { assigneeIds } = assigneesSchema.parse(body);

    // First verify the task belongs to the user's workspace
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("workspace_id", workspaceId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: "Úloha nebola nájdená" },
        { status: 404 }
      );
    }

    // First, delete all existing assignees for this task
    await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId)
      .eq("workspace_id", workspaceId);

    // Then, insert new assignees
    if (assigneeIds.length > 0) {
      const assigneesToInsert = assigneeIds.map(userId => ({
        task_id: taskId,
        user_id: userId,
        workspace_id: workspaceId,
      }));

      const { error: insertError } = await supabase
        .from("task_assignees")
        .insert(assigneesToInsert);

      if (insertError) {
        return NextResponse.json(
          { success: false, error: insertError.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating task assignees:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
