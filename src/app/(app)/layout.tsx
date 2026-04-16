import { AppSidebar } from "@/components/app-sidebar";
import { getActiveWorkspace, getUserOrganizations } from "@/lib/actions/organizations";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const unstable_instant = { 
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'goform_workspace', value: null },
        { name: 'sb-access-token', value: null },
        { name: 'sb-refresh-token', value: null }
      ],
      params: { 
        id: 'sample-id', 
        slug: 'sample-slug' 
      },
      searchParams: { 
        oldEmail: null, 
        newEmail: null 
      }
    }
  ]
};

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
  // Parallelize data fetching for massive TTFB improvement
  const [activeWorkspaceId, orgsResult, userResult] = await Promise.all([
    getActiveWorkspace(),
    getUserOrganizations(),
    getCurrentUserProfile()
  ]);
  
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
    <div className="flex h-svh w-full overflow-hidden bg-background">
      {/* Ghost Sidebar Placeholder */}
      <div className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar animate-pulse">
        <div className="h-14 border-b border-sidebar-border flex items-center px-4">
          <div className="h-8 w-full bg-sidebar-accent/10 rounded" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-full bg-sidebar-accent/5 rounded" />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Ghost Header Placeholder */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary/5" />
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/5" />
        </header>
        
        {/* Real Content rendered instantly! No more hiding children. */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
