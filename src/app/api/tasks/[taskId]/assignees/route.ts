import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assigneesSchema = z.object({
  assigneeIds: z.array(z.string().uuid()),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const supabase = createClient();

    const { data: assignees, error } = await supabase
      .from("task_assignees")
      .select("*")
      .eq("task_id", taskId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch task assignees:", error);
      return NextResponse.json(
        { success: false, error: "Nepodarilo sa načítať priradených používateľov" },
        { status: 500 }
      );
    }

    // Fetch users separately
    const userIds = assignees?.map(a => a.user_id) || [];
    let users: any[] = [];
    
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
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
    const assigneesWithUsers = assignees?.map(assignee => ({
      ...assignee,
      user: users.find(u => u.id === assignee.user_id)
    })) || [];

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
    const { taskId } = await params;
    const supabase = createClient();
    const body = await request.json();
    
    const { assigneeIds } = assigneesSchema.parse(body);

    // First, delete all existing assignees for this task
    await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId);

    // Then, insert new assignees
    if (assigneeIds.length > 0) {
      const assigneesToInsert = assigneeIds.map(userId => ({
        task_id: taskId,
        user_id: userId,
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
