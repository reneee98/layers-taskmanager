import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";
const ASSIGNED = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({ projectId: "11111111-1111-4111-8111-111111111111", update: vi.fn() }));
vi.mock("@/lib/auth/workspace", () => ({ getUserWorkspaceIdFromRequest: async () => "team", getUserWorkspaceId: async () => "team" }));
vi.mock("@/lib/auth/project-access", () => ({
  getProjectAccessContext: async () => ({ hasFullProjectAccess: false, accessibleProjectIds: ["11111111-1111-4111-8111-111111111111"] }),
  canAccessProject: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: "member" } }, error: null }) },
  from: () => {
    const query = { select: () => query, eq: () => query, single: async () => ({ data: { id: "task", project_id: mocks.projectId }, error: null }), update: mocks.update };
    return query;
  },
}) }));
const patch = (body: unknown) => PATCH(new NextRequest("http://localhost/api/tasks/task", {
  method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
}), { params: Promise.resolve({ taskId: "task" }) });
describe("restricted member task boundaries", () => {
  beforeEach(() => { mocks.update.mockClear(); mocks.projectId = ASSIGNED; });
  it("rejects editing a task from an unassigned project", async () => {
    mocks.projectId = OTHER;
    expect((await patch({ title: "Changed" })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects claiming a task from an unassigned project by moving it into an assigned one", async () => {
    mocks.projectId = OTHER;
    expect((await patch({ project_id: ASSIGNED })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects moving an assigned task outside assigned projects", async () => {
    expect((await patch({ project_id: OTHER })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects detaching an assigned task into workspace-wide tasks", async () => {
    expect((await patch({ project_id: null })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
