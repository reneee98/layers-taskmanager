import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalSettings } from "./PersonalSettings";

const mocks = vi.hoisted(() => ({
  refreshProfile: vi.fn(), refreshWorkspace: vi.fn(), toast: vi.fn(),
  state: { owner: false, workspace: true },
  profile: { id: "member", email: "member@example.com", display_name: "member@example.com", first_name: null, last_name: null },
  workspace: { id: "team", owner_id: "owner", name: "Team" },
  ownerWorkspace: { id: "team", owner_id: "member", name: "Team" },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({
  profile: mocks.profile,
  refreshProfile: mocks.refreshProfile,
}) }));
vi.mock("@/contexts/WorkspaceContext", () => ({ useWorkspace: () => ({
  workspace: mocks.state.workspace ? (mocks.state.owner ? mocks.ownerWorkspace : mocks.workspace) : null,
  refreshWorkspace: mocks.refreshWorkspace,
}) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

const enterName = () => {
  fireEvent.change(screen.getByLabelText("Meno"), { target: { value: " Test " } });
  fireEvent.change(screen.getByLabelText("Priezvisko"), { target: { value: " Member " } });
  fireEvent.click(screen.getByRole("button", { name: "Uložiť profil" }));
};

describe("PersonalSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.state.owner = false; mocks.state.workspace = true;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }));
  });
  it("lets a restricted member save their own name without a workspace update", async () => {
    render(<PersonalSettings />);
    expect(screen.queryByLabelText("Názov workspace")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Meno")).toHaveValue("");
    expect(screen.getByLabelText("Prihlasovací email")).toHaveAttribute("readonly");
    enterName();
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalledWith(true));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/users/member", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ first_name: "Test", last_name: "Member", display_name: "Test Member" }),
    }));
    expect(mocks.refreshWorkspace).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Uložiť profil" })).toBeDisabled());
  });
  it("saves an owner's company independently from their personal form", async () => {
    mocks.state.owner = true; render(<PersonalSettings />);
    fireEvent.change(screen.getByLabelText("Názov workspace"), { target: { value: "Updated team" } });
    fireEvent.click(screen.getByRole("button", { name: "Uložiť firemné údaje" }));
    await waitFor(() => expect(mocks.refreshWorkspace).toHaveBeenCalledWith(false));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/workspaces/team", expect.objectContaining({ method: "PATCH" }));
    expect(mocks.refreshProfile).not.toHaveBeenCalled();
  });
  it("keeps failed profile edits available to retry", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ success: false, error: "Server error" }) } as Response);
    render(<PersonalSettings />); enterName();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
    expect(mocks.refreshProfile).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Meno")).toHaveValue(" Test ");
    expect(screen.getByRole("button", { name: "Uložiť profil" })).toBeEnabled();
  });
  it("can save a personal profile even without an active workspace", async () => {
    mocks.state.workspace = false; render(<PersonalSettings />); enterName();
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalledWith(true));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
