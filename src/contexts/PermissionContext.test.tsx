import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionProvider } from "./PermissionContext";
import { WorkspaceContext } from "./WorkspaceContext";
import { usePermission } from "@/hooks/usePermissions";

const mocks = vi.hoisted(() => ({
  user: { id: "member" }, profile: { id: "member", role: "user" }, allowed: true,
}));
vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: mocks.user, profile: mocks.profile }) }));
const Actions = () => {
  const { hasPermission: canCreate, isLoading } = usePermission("tasks", "create");
  const { hasPermission: canUpdate } = usePermission("tasks", "update");
  return <>{!isLoading && <span>Načítané</span>}<button disabled={!canCreate}>Vytvoriť úlohu</button><button disabled={!canUpdate}>Upraviť úlohu</button></>;
};
const renderMember = () => render(
  <WorkspaceContext.Provider value={{
    workspace: { id: "team", name: "Team", owner_id: "owner", role: "member", created_at: "", updated_at: "" },
    workspaceRole: { role: "member" }, workspaces: [], loading: false,
    refreshWorkspace: vi.fn(), switchWorkspace: vi.fn(),
  }}>
    <PermissionProvider><Actions /></PermissionProvider>
  </WorkspaceContext.Provider>
);
describe("member task permissions", () => {
  beforeEach(() => {
    localStorage.clear(); mocks.allowed = true;
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      const { permissions } = JSON.parse(options!.body as string) as { permissions: { resource: string; action: string }[] };
      return { json: async () => ({ success: true, permissions: Object.fromEntries(permissions.map(({ resource, action }) => [`${resource}.${action}`, mocks.allowed])) }) } as Response;
    }));
  });
  it("loads create and update capabilities for a member and repairs a cached read-only permission list", async () => {
    localStorage.setItem("permissions_cache", JSON.stringify({ permissions: { "tasks.read": true }, timestamp: Date.now() }));
    renderMember();
    const create = await screen.findByRole("button", { name: "Vytvoriť úlohu" });
    await waitFor(() => expect(create).toBeEnabled());
    expect(screen.getByRole("button", { name: "Upraviť úlohu" })).toBeEnabled();
    expect(fetch).toHaveBeenCalledWith("/api/auth/check-permissions-batch", expect.objectContaining({ body: expect.stringContaining('"action":"update"') }));
  });
  it("respects a custom role that denies task writes", async () => {
    mocks.allowed = false; renderMember();
    await screen.findByText("Načítané");
    expect(screen.getByRole("button", { name: "Vytvoriť úlohu" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upraviť úlohu" })).toBeDisabled();
  });
});
