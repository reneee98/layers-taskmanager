import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const baseHandler = createMcpHandler(
  async (server) => {
    const { registerLayersTaskTools } = await import("../../../../scripts/mcp/layers-tasks-server.mjs");
    registerLayersTaskTools(server);
  },
  {
    serverInfo: {
      name: "layers-tasks",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api",
    disableSse: true,
    maxDuration: 60,
    verboseLogs: true,
  }
);

const verifyToken = async (
  _request: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  const configuredToken = process.env.LAYERS_MCP_API_TOKEN?.trim();

  if (!configuredToken) {
    return {
      token: "__no_auth_configured__",
      clientId: "layers-mcp-public",
      scopes: ["tasks:read", "tasks:write"],
    };
  }

  if (!bearerToken || bearerToken !== configuredToken) {
    return undefined;
  }

  return {
    token: bearerToken,
    clientId: "layers-mcp-token",
    scopes: ["tasks:read", "tasks:write"],
  };
};

const protectedOrPublicHandler = process.env.LAYERS_MCP_API_TOKEN
  ? withMcpAuth(baseHandler, verifyToken, { required: true })
  : baseHandler;

const handler = async (request: Request) => {
  try {
    return await protectedOrPublicHandler(request);
  } catch (error) {
    console.error("[layers-tasks-mcp-http] Unhandled route error:", error);
    const message = error instanceof Error ? error.stack || error.message : String(error);
    return new Response(message, { status: 500 });
  }
};

export { handler as GET, handler as POST, handler as DELETE };
