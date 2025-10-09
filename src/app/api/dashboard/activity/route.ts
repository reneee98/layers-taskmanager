import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Dočasne vypnutá autentifikácia pre debugging
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json(
    //     { success: false, error: "Nie ste prihlásený" },
    //     { status: 401 }
    //   );
    // }

    // Find user in users table by email - dočasne použiť mock user
    // const { data: dbUser, error: dbUserError } = await supabase
    //   .from("users")
    //   .select("id")
    //   .eq("email", user.email)
    //   .single();

    // if (dbUserError || !dbUser) {
    //   return NextResponse.json(
    //     { success: false, error: "Používateľ nebol nájdený v databáze" },
    //     { status: 404 }
    //   );
    // }

    // Mock user ID pre testovanie
    const dbUser = { id: "mock-user-id" };

    // Dočasne vrátiť mock dáta pre testovanie
    const activities = [
      {
        id: "activity-1",
        type: "time_entry",
        action: "Pridal čas",
        details: "4h na Test úlohu",
        project: "Test projekt",
        project_code: "TEST-001",
        user: "Test používateľ",
        created_at: "2025-10-09T12:00:00Z",
        description: "Testovanie funkcionality"
      },
      {
        id: "activity-2",
        type: "task_update",
        action: "Aktualizoval úlohu",
        details: "Úloha \"Test úloha\" aktualizovaná",
        project: "Test projekt",
        project_code: "TEST-001",
        user: "Systém",
        created_at: "2025-10-09T11:30:00Z",
        description: "Zmena statusu na in_progress"
      },
      {
        id: "activity-3",
        type: "comment",
        action: "Pridal komentár",
        details: "Komentár pridaný",
        project: "Test projekt",
        project_code: "TEST-001",
        user: "Test používateľ",
        created_at: "2025-10-09T11:00:00Z",
        description: "Potrebujem viac informácií"
      }
    ];

    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Activity API error:", error);
    return NextResponse.json(
      { success: false, error: "Neznáma chyba" },
      { status: 500 }
    );
  }
}