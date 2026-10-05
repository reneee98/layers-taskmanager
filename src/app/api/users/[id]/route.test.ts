import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

const mocks = vi.hoisted(() => ({ user: { id: "member" } as { id: string } | null, update: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/auth/admin", () => ({
  getServerUser: async () => mocks.user,
  requireAdmin: async () => { throw new Error("Forbidden"); },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ from: () => ({
  update: (data: unknown) => { mocks.update(data); return { eq: (key: string, value: string) => {
    mocks.eq(key, value); return { select: () => ({ single: mocks.single }) };
  } }; },
}) }) }));
const patch = (body: unknown, id = "member") => PATCH(new NextRequest("http://localhost/api/users/" + id, {
  method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
}), { params: { id } });
describe("member profile updates", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "member" }; mocks.single.mockResolvedValue({ data: { id: "member", display_name: "Test Member" }, error: null }); });
  it("updates the authenticated member's own name with only profile fields", async () => {
    const response = await patch({ first_name: "Test", last_name: "Member", display_name: "Test Member", workspace_id: "other", email: "other@example.com" });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ first_name: "Test", last_name: "Member", display_name: "Test Member" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "member");
  });
  it("rejects changing another user's profile", async () => {
    expect((await patch({ display_name: "Changed Name" }, "other")).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects promoting a member to admin", async () => {
    expect((await patch({ role: "admin" })).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    mocks.user = null;
    expect((await patch({ display_name: "Changed Name" })).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
