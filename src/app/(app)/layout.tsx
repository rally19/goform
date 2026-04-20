import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { 
  SidebarProvider,
  Sidebar, 
  SidebarHeader, 
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { getActiveWorkspace, getUserOrganizations } from "@/lib/actions/organizations";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { Suspense } from "react";
import { OrganizationObserver } from "@/components/organization-observer";
import { cookies } from "next/headers";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";

export const unstable_instant = { 
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'goform_workspace', value: null },
        { name: 'sb-access-token', value: null },
        { name: 'sb-refresh-token', value: null },
        { name: 'sidebar_state', value: null }
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
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LayoutStaticShell>{children}</LayoutStaticShell>}>
      <AppLayoutPersistence>{children}</AppLayoutPersistence>
    </Suspense>
  );
}

async function AppLayoutPersistence({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

function LayoutStaticShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}

function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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

      {/* Dynamic Security Observer (Deferred) */}
      <Suspense fallback={null}>
        <ObserverWrapper />
      </Suspense>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded bg-primary/5" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full bg-primary/5" />
      </div>
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
      {/* Workspace Switcher Ghost */}
      <SidebarHeader className="border-b border-sidebar-border h-14 flex flex-col justify-center px-2">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/5">
          <Skeleton className="h-8 w-8 rounded-full bg-primary/10 shrink-0" />
          <div className="flex-1 space-y-1.5 overflow-hidden">
            <Skeleton className="h-3 w-24 bg-sidebar-accent/20" />
            <Skeleton className="h-2 w-16 bg-sidebar-accent/10" />
          </div>
          <ChevronDown className="h-4 w-4 text-sidebar-accent/20 shrink-0" />
        </div>
      </SidebarHeader>

      {/* Menu Ghost */}
      <SidebarContent className="p-2">
        <div className="px-2 py-4 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-3 w-12 bg-sidebar-accent/10 ml-2 mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2">
                <Skeleton className="h-4 w-4 rounded bg-sidebar-accent/20 shrink-0" />
                <Skeleton className="h-4 w-full bg-sidebar-accent/10" />
              </div>
            ))}
          </div>
        </div>
      </SidebarContent>

      {/* User Widget Ghost */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 p-1 rounded-lg">
          <Skeleton className="h-8 w-8 rounded-full bg-sidebar-accent/20 shrink-0" />
          <div className="flex-1 space-y-1.5 overflow-hidden">
            <Skeleton className="h-3.5 w-20 bg-sidebar-accent/20" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md bg-sidebar-accent/10 shrink-0" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
