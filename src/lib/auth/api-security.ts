import { NextRequest, NextResponse } from "next/server";
import { validateWorkspaceAccess, WorkspaceAccessResult } from "./workspace-security";

/**
 * Security wrapper for API routes that require workspace access
 */
export function withWorkspaceSecurity(
  handler: (request: NextRequest, workspaceAccess: WorkspaceAccessResult) => Promise<NextResponse>
) {
  return async function securedHandler(request: NextRequest) {
    try {
      const accessResult = await validateWorkspaceAccess(request);
      
      if (!accessResult.hasAccess) {
        console.log(`SECURITY: Access denied - ${accessResult.error}`);
        return NextResponse.json({ 
          success: false, 
          error: accessResult.error || "Access denied" 
        }, { status: 403 });
      }

      return handler(request, accessResult);
    } catch (error) {
      console.error("Error in workspace security middleware:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Internal server error" 
      }, { status: 500 });
    }
  };
}

/**
 * Security wrapper for API routes that require owner access
 */
export function withOwnerSecurity(
  handler: (request: NextRequest, workspaceAccess: WorkspaceAccessResult) => Promise<NextResponse>
) {
  return async function ownerSecuredHandler(request: NextRequest) {
    try {
      const accessResult = await validateWorkspaceAccess(request);
      
      if (!accessResult.hasAccess) {
        console.log(`SECURITY: Access denied - ${accessResult.error}`);
        return NextResponse.json({ 
          success: false, 
          error: accessResult.error || "Access denied" 
        }, { status: 403 });
      }

      if (!accessResult.isOwner) {
        console.log(`SECURITY: Owner access required - User is not owner`);
        return NextResponse.json({ 
          success: false, 
          error: "Access denied - only workspace owners can perform this action" 
        }, { status: 403 });
      }

      return handler(request, accessResult);
    } catch (error) {
      console.error("Error in owner security middleware:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Internal server error" 
      }, { status: 500 });
    }
  };
}

/**
 * Security wrapper for API routes that require member or owner access
 */
export function withMemberSecurity(
  handler: (request: NextRequest, workspaceAccess: WorkspaceAccessResult) => Promise<NextResponse>
) {
  return async function memberSecuredHandler(request: NextRequest) {
    try {
      const accessResult = await validateWorkspaceAccess(request);
      
      if (!accessResult.hasAccess) {
        console.log(`SECURITY: Access denied - ${accessResult.error}`);
        return NextResponse.json({ 
          success: false, 
          error: accessResult.error || "Access denied" 
        }, { status: 403 });
      }

      if (!accessResult.isOwner && !accessResult.isMember) {
        console.log(`SECURITY: Member access required - User is not member or owner`);
        return NextResponse.json({ 
          success: false, 
          error: "Access denied - only workspace members can perform this action" 
        }, { status: 403 });
      }

      return handler(request, accessResult);
    } catch (error) {
      console.error("Error in member security middleware:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Internal server error" 
      }, { status: 500 });
    }
  };
}
