import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
const mocks = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: unknown) => unknown),
  locked: false,
  profile: { id: "member", email: "member@example.com", display_name: "Original Name", role: "user" },
  single: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (callback: typeof mocks.callback) => { mocks.callback = callback; mocks.subscribe(); return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; },
  },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => {
    if (mocks.locked) throw new Error("Auth lock held");
    mocks.single(); return { data: { ...mocks.profile }, error: null };
  } }) }) }),
}) }));
const Profile = () => {
  const { profile, refreshProfile } = useAuth();
  return <><span>{profile?.display_name || "No profile"}</span><button onClick={() => void refreshProfile(true)}>Refresh</button></>;
};
describe("AuthProvider profile refresh", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.callback = null; mocks.locked = false; mocks.profile.display_name = "Original Name"; });
  it("loads the profile outside the auth callback and refreshes saved names without resubscribing", async () => {
    render(<AuthProvider><Profile /></AuthProvider>);
    await waitFor(() => expect(mocks.callback).not.toBeNull());
    act(() => {
      mocks.locked = true;
      const result = mocks.callback!("SIGNED_IN", { user: { id: "member", email: "member@example.com" } });
      expect(result).toBeUndefined();
      expect(mocks.single).not.toHaveBeenCalled();
      mocks.locked = false;
    });
    await screen.findByText("Original Name");
    mocks.profile.display_name = "Saved Name";
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("Saved Name");
    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
    act(() => { mocks.callback!("SIGNED_OUT", null); });
    await screen.findByText("No profile");
  });
});
