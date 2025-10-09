import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Nie ste prihlásený" },
        { status: 401 }
      );
    }

    // Find user in users table by email
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single();

    if (dbUserError || !dbUser) {
      return NextResponse.json(
        { success: false, error: "Používateľ nebol nájdený v databáze" },
        { status: 404 }
      );
    }

    
    // Použij task_assignees tabuľku na nájdenie priradených úloh
    const { data: tasks, error: tasksError } = await supabase
      .from("task_assignees")
      .select(`
        task:tasks(
          id,
          title,
          description,
          status,
          priority,
          estimated_hours,
          actual_hours,
          due_date,
          created_at,
          updated_at,
          project_id,
          assignee_id,
          assigned_to,
          budget_amount,
          project:projects(
            id,
            name,
            code,
            client:clients(name)
          )
        )
      `)
      .eq("user_id", dbUser.id);
    

    if (tasksError) {
      return NextResponse.json(
        { success: false, error: tasksError.message },
        { status: 500 }
      );
    }

    // Transform data and calculate time until deadline
    const now = new Date();
    const transformedTasks = (tasks || [])
      .map(({ task }) => {
        if (!task) return null;
        
        let daysUntilDeadline = null;
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          const diffTime = dueDate.getTime() - now.getTime();
          daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          ...task,
          days_until_deadline: daysUntilDeadline,
        };
      })
      .filter(Boolean)
      .filter((task): task is NonNullable<typeof task> => task !== null && task.status !== 'done' && task.status !== 'invoiced') // Exclude done and invoiced tasks
      .sort((a, b) => {
        // Sort by deadline urgency (nulls last)
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

    return NextResponse.json({
      success: true,
      data: transformedTasks,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}
