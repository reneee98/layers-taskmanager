import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useCurrentWorkspace() {
  const { workspace } = useWorkspace();
  return workspace?.id || null;
}
