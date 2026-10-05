import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), createServiceClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createClient: mocks.createServiceClient }));

import { GET, POST, DELETE } from "./route";
import { getProjectAccessContext } from "@/lib/auth/project-access";

const owner = "00000000-0000-4000-8000-000000000001";
const restricted = "00000000-0000-4000-8000-000000000002";
const outsider = "00000000-0000-4000-8000-000000000003";
const fullMember = "00000000-0000-4000-8000-000000000004";
const projectId = "00000000-0000-4000-8000-000000000010";
const otherProjectId = "00000000-0000-4000-8000-000000000011";
const workspaceId = "00000000-0000-4000-8000-000000000020";
type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let currentUser: string | null;
let failWrites: boolean;

// Model filtered database reads/writes so tests exercise access changes across both APIs.
const createQuery = (table: string) => {
  const filters: Array<(row: Row) => boolean> = [];
  let operation = "read";
  let value: Row | null = null;
  const run = () => {
    const matches = (row: Row) => filters.every((filter) => filter(row));
    if (operation !== "read" && failWrites)
      return { data: null, error: { message: "write failed" } };
    if (operation === "delete") tables[table] = tables[table].filter((row) => !matches(row));
    if (operation === "upsert" && value) {
      const entry = value;
      if (
        !tables[table].some(
          (row) => row.project_id === entry.project_id && row.user_id === entry.user_id
        )
      ) {
        tables[table].push(entry);
      }
    }
    return { data: tables[table].filter(matches), error: null };
  };
  const query = {
    select: () => query,
    eq: (key: string, expected: unknown) => {
      filters.push((row) => row[key] === expected);
      return query;
    },
    in: (key: string, values: unknown[]) => {
      filters.push((row) => values.includes(row[key]));
      return query;
    },
    delete: () => {
      operation = "delete";
      return query;
    },
    upsert: (entry: Row) => {
      operation = "upsert";
      value = entry;
      return query;
    },
    maybeSingle: async () => {
      const result = run();
      return { ...result, data: result.data?.[0] ?? null };
    },
    then: (resolve: (result: ReturnType<typeof run>) => unknown) =>
      Promise.resolve(run()).then(resolve),
  };
  return query;
};

const request = (method = "GET", userId = restricted) =>
  new NextRequest(`http://localhost/api/projects/${projectId}/members`, {
    method,
    ...(method === "GET" ? {} : { body: JSON.stringify({ user_id: userId }) }),
  });
const context = { params: { projectId } };

describe("project member access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = owner;
    failWrites = false;
    tables = {
      projects: [
        { id: projectId, workspace_id: workspaceId },
        { id: otherProjectId, workspace_id: workspaceId },
      ],
      workspaces: [{ id: workspaceId, owner_id: owner }],
      workspace_members: [
        { user_id: owner, workspace_id: workspaceId, role: "owner", project_access_scope: "all" },
        {
          user_id: restricted,
          workspace_id: workspaceId,
          role: "member",
          project_access_scope: "restricted",
        },
        {
          user_id: fullMember,
          workspace_id: workspaceId,
          role: "member",
          project_access_scope: "all",
        },
      ],
      profiles: [
        { id: owner, email: "owner@example.com" },
        { id: restricted, email: "member@example.com" },
      ],
      project_members: [
        { project_id: otherProjectId, user_id: restricted, role: "member", hourly_rate: 25 },
      ],
    };
    const client = {
      auth: {
        getUser: async () => ({
          data: { user: currentUser ? { id: currentUser } : null },
          error: null,
        }),
      },
      from: (table: string) => createQuery(table),
    };
    mocks.createClient.mockReturnValue(client);
    mocks.createServiceClient.mockReturnValue(client);
  });

  it("grants access to this project and removal preserves other assignments", async () => {
    const before = await getProjectAccessContext(workspaceId, restricted);
    expect(before.accessibleProjectIds).toEqual([otherProjectId]);
    expect((await POST(request("POST"), context)).status).toBe(200);
    const after = await getProjectAccessContext(workspaceId, restricted);
    expect(after.accessibleProjectIds).toEqual(expect.arrayContaining([projectId, otherProjectId]));
    expect(after.hasFullProjectAccess).toBe(false);
    expect((await DELETE(request("DELETE"), context)).status).toBe(200);
    expect((await getProjectAccessContext(workspaceId, restricted)).accessibleProjectIds).toEqual([
      otherProjectId,
    ]);
    expect(tables.project_members[0].hourly_rate).toBe(25);
  });

  it("repeated assignment preserves existing rates and roles", async () => {
    tables.project_members.push({
      project_id: projectId,
      user_id: restricted,
      role: "lead",
      hourly_rate: 45,
    });
    await POST(request("POST"), context);
    await POST(request("POST"), context);
    expect(tables.project_members.filter((row) => row.project_id === projectId)).toEqual([
      { project_id: projectId, user_id: restricted, role: "lead", hourly_rate: 45 },
    ]);
  });

  it("rejects unauthenticated requests before creating a service client", async () => {
    currentUser = null;
    expect((await GET(request(), context)).status).toBe(401);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("blocks outsiders despite service-role database access", async () => {
    currentUser = outsider;
    expect((await GET(request(), context)).status).toBe(403);
    expect((await POST(request("POST"), context)).status).toBe(403);
  });

  it("blocks unassigned restricted members and does not expose the team directory", async () => {
    currentUser = restricted;
    expect((await GET(request(), context)).status).toBe(403);
    tables.project_members.push({ project_id: projectId, user_id: restricted });
    const response = await GET(request(), context);
    expect(await response.json()).toMatchObject({
      success: true,
      data: [],
      can_manage_members: false,
    });
    expect((await POST(request("POST"), context)).status).toBe(403);
    expect((await DELETE(request("DELETE"), context)).status).toBe(403);
  });

  it("rejects targets from another workspace", async () => {
    tables.workspace_members.push({
      user_id: outsider,
      workspace_id: "another-workspace",
      role: "member",
    });
    expect((await POST(request("POST", outsider), context)).status).toBe(400);
    expect(tables.project_members).toHaveLength(1);
  });

  it("keeps full-workspace access unchanged when assigning or removing a member", async () => {
    await POST(request("POST", fullMember), context);
    await DELETE(request("DELETE", fullMember), context);
    expect((await getProjectAccessContext(workspaceId, fullMember)).hasFullProjectAccess).toBe(
      true
    );
  });

  it("does not allow changing owner or admin membership", async () => {
    expect((await POST(request("POST", owner), context)).status).toBe(400);
    tables.workspace_members[2].role = "admin";
    expect((await DELETE(request("DELETE", fullMember), context)).status).toBe(400);
  });

  it("reports database errors without claiming the assignment succeeded", async () => {
    failWrites = true;
    expect((await POST(request("POST"), context)).status).toBe(500);
    expect(tables.project_members).toHaveLength(1);
  });

  it("validates the project and malformed member payload", async () => {
    expect((await GET(request(), { params: { projectId: "invalid" } })).status).toBe(400);
    expect((await POST(request("POST", "invalid"), context)).status).toBe(400);
    const malformed = new NextRequest("http://localhost/api/members", {
      method: "POST",
      body: "{",
    });
    expect((await POST(malformed, context)).status).toBe(400);
  });

  it("lists workspace users with assignment and automatic-access status", async () => {
    await POST(request("POST"), context);
    const response = await GET(request(), context);
    const result = await response.json();
    expect(result.can_manage_members).toBe(true);
    expect(
      result.data.find((member: { user_id: string }) => member.user_id === restricted)
    ).toMatchObject({
      is_assigned: true,
      has_full_access: false,
      is_privileged: false,
    });
    expect(
      result.data.find((member: { user_id: string }) => member.user_id === owner)
    ).toMatchObject({
      has_full_access: true,
      is_privileged: true,
    });
  });
});
