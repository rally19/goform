"use client";

import { usePathname } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
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
} from "@/components/ui/sidebar";
import {
  Building2,
  LayoutDashboard,
  SquarePen,
  Loader2,
} from "lucide-react";
import { UserAccountWidget } from "@/components/user-account-widget";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { setActiveWorkspace } from "@/lib/actions/organizations";
import { useRouter } from "next/navigation";

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
];

export function AppSidebar({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: any[];
  activeWorkspaceId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleNavigation = (href: string) => {
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const hideNav = pathname.includes('/forms/') && (
    pathname.endsWith('/edit') || 
    pathname.endsWith('/results') || 
    pathname.endsWith('/analytics') || 
    pathname.endsWith('/settings')
  );

  if (hideNav) return null;

  return (
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
              {navigation.map((item) => {
                const isLoading = isPending && pendingHref === item.href;
                const isActive = isPending 
                  ? pendingHref === item.href 
                  : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                    >
                      <Link 
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigation(item.href);
                        }}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <item.icon />
                        )}
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <UserAccountWidget 
          handleNavigation={handleNavigation}
          isPending={isPending}
          pendingHref={pendingHref}
          pathname={pathname}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
