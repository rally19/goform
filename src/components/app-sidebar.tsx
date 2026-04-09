"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Building2,
  LayoutDashboard,
  Settings,
  SquarePen,
} from "lucide-react";
import { UserAccountWidget } from "@/components/user-account-widget";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { setActiveWorkspace } from "@/lib/actions/organizations";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Forms",
    href: "/forms",
    icon: SquarePen,
  },
  {
    name: "Organizations",
    href: "/organizations",
    icon: Building2,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({
  children,
  workspaces,
  activeWorkspaceId,
}: {
  children: React.ReactNode;
  workspaces: any[];
  activeWorkspaceId: string;
}) {
  const pathname = usePathname();

  const hideNav = pathname.includes('/forms/') && (
    pathname.endsWith('/edit') || 
    pathname.endsWith('/results') || 
    pathname.endsWith('/analytics') || 
    pathname.endsWith('/settings')
  );

  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden bg-background">
        {!hideNav && (
          <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border h-14 flex flex-col justify-center px-2">
              <WorkspaceSwitcher 
                workspaces={workspaces} 
                activeWorkspaceId={activeWorkspaceId} 
                onWorkspaceChange={setActiveWorkspace}
              />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Menu</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigation.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
             <SidebarFooter className="border-t border-sidebar-border p-4 flex flex-row items-center justify-between">
              <UserAccountWidget />
            </SidebarFooter>
          </Sidebar>
        )}

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          {!hideNav && (
            <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
              </div>
            </header>
          )}
          
          {/* Content Area */}
          <main className="flex-1 min-h-0 w-full">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
