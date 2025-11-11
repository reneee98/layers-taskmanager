import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/admin";
import { updateSettingsSchema } from "@/lib/validations/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Get or create user settings
    let { data: settings, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If settings don't exist, create default ones
    if (error && error.code === 'PGRST116') {
      const { data: newSettings, error: insertError } = await supabase
        .from("user_settings")
        .insert({
          user_id: user.id,
          language: "sk",
          theme: "system",
          notifications: {
            email: true,
            push: true,
            task_updates: true,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user settings:", insertError);
        return NextResponse.json(
          { success: false, error: "Failed to create settings" },
          { status: 500 }
        );
      }

      settings = newSettings;
    } else if (error) {
      console.error("Error fetching user settings:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error in GET /api/me/settings:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Prepare update data
    const updateData: any = {};
    if (validation.data.language !== undefined) {
      updateData.language = validation.data.language;
    }
    if (validation.data.theme !== undefined) {
      updateData.theme = validation.data.theme;
    }
    if (validation.data.default_hourly_rate !== undefined) {
      updateData.default_hourly_rate = validation.data.default_hourly_rate;
    }
    if (validation.data.notifications !== undefined) {
      // Merge with existing notifications
      const { data: currentSettings } = await supabase
        .from("user_settings")
        .select("notifications")
        .eq("user_id", user.id)
        .single();

      const currentNotifications = currentSettings?.notifications || {
        email: true,
        push: true,
        task_updates: true,
      };

      updateData.notifications = {
        ...currentNotifications,
        ...validation.data.notifications,
      };
    }

    // Update settings
    const { data: updatedSettings, error } = await supabase
      .from("user_settings")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      // If settings don't exist, create them
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            language: validation.data.language || "sk",
            theme: validation.data.theme || "system",
            notifications: updateData.notifications || {
              email: true,
              push: true,
              task_updates: true,
            },
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating user settings:", insertError);
          return NextResponse.json(
            { success: false, error: "Failed to create settings" },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data: newSettings });
      }

      console.error("Error updating user settings:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updatedSettings });
  } catch (error) {
    console.error("Error in PATCH /api/me/settings:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
