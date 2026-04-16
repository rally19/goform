import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { 
  SidebarProvider,
  Sidebar, 
  SidebarHeader, 
  SidebarContent 
} from "@/components/ui/sidebar";
import { getActiveWorkspace, getUserOrganizations } from "@/lib/actions/organizations";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { Suspense } from "react";
import { OrganizationObserver } from "@/components/organization-observer";

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
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden bg-background">
        {/*
          DEFERRED SIDEBAR:
          Only the sidebar navigation/workspace switcher is behind Suspense.
          This prevents the entire page from waiting for organization data.
        */}
        <Suspense fallback={<SidebarGhost />}>
          <SidebarDataWrapper />
        </Suspense>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 
            HEADER SHELL:
            Wrapped in Suspense to allow usePathname to remain dynamic 
            without blocking the Static Shell generation.
          */}
          <Suspense fallback={<HeaderSkeleton />}>
            <AppHeader />
          </Suspense>
          
          {/* 
            STATIC MAIN CONTENT:
            Rendered instantly as part of the Static Shell.
          */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Dynamic Security Observer (Deferred) */}
      <Suspense fallback={null}>
        <ObserverWrapper />
      </Suspense>
    </SidebarProvider>
  );
}

function HeaderSkeleton() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded bg-primary/5 animate-pulse" />
      </div>
      <div className="h-8 w-8 rounded-full bg-primary/5 animate-pulse" />
    </header>
  );
}

async function SidebarDataWrapper() {
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
    />
  );
}

async function ObserverWrapper() {
  const [activeWorkspaceId, userResult] = await Promise.all([
    getActiveWorkspace(),
    getCurrentUserProfile()
  ]);

  if (!userResult.success || !userResult.data) return null;

  return (
    <OrganizationObserver 
      currentUserId={userResult.data.id} 
      activeWorkspaceId={activeWorkspaceId} 
    />
  );
}


function SidebarGhost() {
  return (
    <Sidebar className="hidden md:block">
      <SidebarHeader className="border-b border-sidebar-border h-14 flex flex-col justify-center px-2 animate-pulse">
        <div className="h-8 w-full bg-sidebar-accent/10 rounded" />
      </SidebarHeader>
      <SidebarContent className="animate-pulse p-2">
        <div className="space-y-4 p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-full bg-sidebar-accent/5 rounded" />
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
