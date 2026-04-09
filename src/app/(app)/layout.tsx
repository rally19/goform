import { AppSidebar } from "@/components/app-sidebar";
import { getActiveWorkspace, getUserOrganizations } from "@/lib/actions/organizations";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeWorkspaceId = await getActiveWorkspace();
  const orgsResult = await getUserOrganizations();
  
  const workspaces: { id: string; name: string; type: string; avatarUrl?: string }[] = [
    {
      id: PERSONAL_WORKSPACE_ID,
      name: "Personal Workspace",
      type: "personal",
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
    <AppSidebar workspaces={workspaces} activeWorkspaceId={activeWorkspaceId}>
      {children}
    </AppSidebar>
  );
}
