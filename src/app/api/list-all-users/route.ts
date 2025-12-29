import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const serviceClient = createServiceClient();
    
    if (!serviceClient) {
      return NextResponse.json({ 
        success: false, 
        error: "Service client not available - SUPABASE_SERVICE_ROLE_KEY not set" 
      }, { status: 500 });
    }

    // Najprv skús získať profiles (to by malo fungovať aj bez auth.users)
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch profiles",
        details: profilesError.message 
      }, { status: 500 });
    }

    // Skús získať používateľov z auth.users (môže zlyhať kvôli DNS/pripojeniu)
    let users = null;
    let authError = null;
    try {
      const authResult = await serviceClient.auth.admin.listUsers();
      users = authResult.data?.users || null;
      authError = authResult.error;
    } catch (error: any) {
      console.warn('Could not fetch auth.users (this is OK if DNS/network issue):', error.message);
      authError = error;
    }

    // Ak máme auth.users, zlúč ich s profiles
    if (users && users.length > 0) {
      const profilesMap = new Map();
      if (profiles) {
        profiles.forEach(p => {
          profilesMap.set(p.id, p);
        });
      }

      const usersWithProfiles = users.map(user => {
        const profile = profilesMap.get(user.id);
        return {
          id: user.id,
          email: user.email,
          display_name: profile?.display_name || null,
          role: profile?.role || null,
          email_confirmed: !!user.email_confirmed_at,
          email_confirmed_at: user.email_confirmed_at,
          last_sign_in_at: user.last_sign_in_at,
          created_at: user.created_at,
          has_profile: !!profile
        };
      });

      return NextResponse.json({ 
        success: true, 
        count: usersWithProfiles.length,
        users: usersWithProfiles,
        profiles_count: profiles?.length || 0,
        auth_users_count: users.length,
        note: authError ? 'auth.users loaded with warning: ' + authError.message : null
      });
    } else {
      // Ak nemáme auth.users, vráť aspoň profiles
      return NextResponse.json({ 
        success: true, 
        count: profiles?.length || 0,
        users: profiles || [],
        profiles_count: profiles?.length || 0,
        auth_users_count: 0,
        note: authError ? 'Could not load auth.users (DNS/network issue): ' + (authError.message || 'Unknown error') : 'Using profiles table only'
      });
    }

  } catch (error) {
    console.error('Error in list-all-users:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

