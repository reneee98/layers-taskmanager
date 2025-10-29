import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@/lib/supabase/service";
import { getServerUser } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  try {
    // Only allow admin to create test users
    const admin = await getServerUser();
    if (!admin || admin.email !== 'design@renemoravec.sk') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const supabase = createClient();
    const serviceClient = createServiceClient();
    
    // Get Layers workspace ID
    const layersWorkspaceId = '6dd7d31a-3d36-4d92-a8eb-7146703a00b0';
    
    // Use service client if available, otherwise use regular client (will only see what RLS allows)
    const checkClient = serviceClient || supabase;
    
    // Check current members before creating users
    const { data: membersBefore } = await checkClient
      .from('workspace_members')
      .select('user_id, profiles(email, display_name)')
      .eq('workspace_id', layersWorkspaceId);
    
    console.log("DEBUG: Current members in Layers workspace before creating test users:", membersBefore);
    
    // Create test user 1 - simulate normal registration
    const testEmail1 = `test-${Date.now()}-1@example.com`;
    const testPassword1 = 'TestPassword123!';
    
    // Use service client for creating users if available, otherwise we can't create users via API
    if (!serviceClient) {
      return NextResponse.json({ 
        success: false, 
        error: "SUPABASE_SERVICE_ROLE_KEY not set - cannot create test users via API. Please set the environment variable or test manually via registration form.",
        instruction: "To set SUPABASE_SERVICE_ROLE_KEY: Add it to your .env.local file with the value from Supabase Dashboard -> Settings -> API -> service_role key"
      }, { status: 500 });
    }
    
    const { data: user1, error: signUpError1 } = await serviceClient.auth.admin.createUser({
      email: testEmail1,
      password: testPassword1,
      email_confirm: true,
      user_metadata: {
        display_name: 'Test User 1'
      }
    });
    
    if (signUpError1 || !user1?.user) {
      console.error("Error creating test user 1:", signUpError1);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create test user 1",
        details: signUpError1 
      }, { status: 500 });
    }
    
    console.log("DEBUG: User 1 created, checking membership immediately...");
    
    // Check IMMEDIATELY after user creation (before waiting)
    const { data: member1Immediate } = await serviceClient
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', layersWorkspaceId)
      .eq('user_id', user1.user.id)
      .maybeSingle();
    
    console.log("DEBUG: User 1 immediate check (0s delay):", { 
      found: !!member1Immediate,
      member: member1Immediate 
    });
    
    // Wait a bit for profile to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check again after 1 second
    const { data: member1After1s } = await serviceClient
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', layersWorkspaceId)
      .eq('user_id', user1.user.id)
      .maybeSingle();
    
    console.log("DEBUG: User 1 check after 1s delay:", { 
      found: !!member1After1s,
      member: member1After1s 
    });
    
    // Wait another second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Final check if user 1 was automatically added to Layers workspace (using service client to bypass RLS)
    const { data: member1Check, error: checkError1 } = await serviceClient
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', layersWorkspaceId)
      .eq('user_id', user1.user.id)
      .maybeSingle();
    
    console.log("DEBUG: User 1 final check result (2s delay):", { 
      userId: user1.user.id, 
      email: testEmail1,
      found: !!member1Check,
      member: member1Check,
      error: checkError1,
      whenAdded: member1Check ? "between 0-2 seconds after creation" : "not found"
    });
    
    // Create test user 2
    const testEmail2 = `test-${Date.now()}-2@example.com`;
    const testPassword2 = 'TestPassword123!';
    
    const { data: user2, error: signUpError2 } = await serviceClient.auth.admin.createUser({
      email: testEmail2,
      password: testPassword2,
      email_confirm: true,
      user_metadata: {
        display_name: 'Test User 2'
      }
    });
    
    if (signUpError2 || !user2?.user) {
      console.error("Error creating test user 2:", signUpError2);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create test user 2",
        details: signUpError2 
      }, { status: 500 });
    }
    
    // Wait a bit for profile to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if user 2 was automatically added to Layers workspace (using service client to bypass RLS)
    const { data: member2Check, error: checkError2 } = await serviceClient
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', layersWorkspaceId)
      .eq('user_id', user2.user.id)
      .maybeSingle();
    
    console.log("DEBUG: User 2 check result:", { 
      userId: user2.user.id, 
      email: testEmail2,
      found: !!member2Check,
      member: member2Check,
      error: checkError2 
    });
    
    // Get final members list (using service client to bypass RLS)
    const { data: membersAfter } = await serviceClient
      .from('workspace_members')
      .select('user_id, profiles(email, display_name)')
      .eq('workspace_id', layersWorkspaceId);
    
    return NextResponse.json({
      success: true,
      testUsers: [
        {
          email: testEmail1,
          password: testPassword1,
          userId: user1.user.id,
          automaticallyAddedToLayers: !!member1Check
        },
        {
          email: testEmail2,
          password: testPassword2,
          userId: user2.user.id,
          automaticallyAddedToLayers: !!member2Check
        }
      ],
      membersBefore: membersBefore?.length || 0,
      membersAfter: membersAfter?.length || 0,
      message: member1Check || member2Check 
        ? "⚠️ PROBLEM: Test users were automatically added to Layers workspace!"
        : "✅ OK: Test users were NOT automatically added to Layers workspace"
    });
    
  } catch (error: any) {
    console.error("Error in create-test-users:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}

