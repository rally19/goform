import { AppSidebar } from "@/components/app-sidebar";
import { getActiveWorkspace, getUserOrganizations } from "@/lib/actions/organizations";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeWorkspaceId = await getActiveWorkspace();
  const orgsResult = await getUserOrganizations();
  const userResult = await getCurrentUserProfile();
  
  const workspaces: { id: string; name: string; type: "personal" | "organization"; avatarUrl?: string | null }[] = [
    {
      id: PERSONAL_WORKSPACE_ID,
      name: "Personal Workspace",
      type: "personal",
      avatarUrl: (userResult.success && userResult.data) ? userResult.data.avatarUrl : null,
    }
  ];

  if (orgsResult.success && orgsResult.data) {
    orgsResult.data.forEach((org: any) => {
      workspaces.push({
        id: org.id,
        name: org.name,
        type: "organization",
        avatarUrl: org.avatarUrl,
      });
    });
  }

  return (
    <AppSidebar 
      workspaces={workspaces} 
      activeWorkspaceId={activeWorkspaceId}
      currentUserId={userResult.success && userResult.data ? userResult.data.id : ""}
    >
      {children}
    </AppSidebar>
  );
}
