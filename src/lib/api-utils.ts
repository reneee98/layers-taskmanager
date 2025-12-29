import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useApiUrl() {
  const { workspace } = useWorkspace();
  
  const getApiUrl = (endpoint: string) => {
    const baseUrl = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return workspace ? `${baseUrl}?workspace_id=${workspace.id}` : baseUrl;
  };
  
  return { getApiUrl };
}
