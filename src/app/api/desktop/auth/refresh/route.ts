import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawRefreshToken = body.refreshToken ?? body.refresh_token;
    const refreshToken = typeof rawRefreshToken === "string" ? rawRefreshToken : "";

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "Chýba obnovovací token" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        { success: false, error: "Relácia vypršala. Prihláste sa znova." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Desktop session refresh failed:", error);
    return NextResponse.json(
      { success: false, error: "Reláciu sa nepodarilo obnoviť" },
      { status: 500 }
    );
  }
}
