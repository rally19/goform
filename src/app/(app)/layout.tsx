import { AppSidebar } from "@/components/app-sidebar";
import { getActiveWorkspace, getUserOrganizations } from "@/lib/actions/organizations";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const unstable_instant = { prefetch: 'static' };

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SidebarSkeleton>{children}</SidebarSkeleton>}>
      <SidebarDataWrapper>{children}</SidebarDataWrapper>
    </Suspense>
  );
}

async function SidebarDataWrapper({ children }: { children: React.ReactNode }) {
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

function SidebarSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        <span className="text-sm text-muted-foreground animate-pulse">Initializing workspace...</span>
      </div>
      <div className="hidden">{children}</div>
    </div>
  );
}
