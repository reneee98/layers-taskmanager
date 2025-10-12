import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/admin";
import { WorkspaceMembersPage } from "@/components/workspace/WorkspaceMembersPage";

export default async function Page() {
  const user = await getServerUser();
  
  if (!user) {
    redirect("/login");
  }
  
  return <WorkspaceMembersPage />;
}
