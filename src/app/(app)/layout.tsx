"use client";

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
  Users 
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAccountWidget } from "@/components/user-account-widget";

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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Check if we should hide the sidebar and top bar
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
            <SidebarHeader className="border-b border-sidebar-border px-4 py-3 h-14 flex justify-center">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
                  <SquarePen className="size-4" />
                </div>
                <span className="text-lg tracking-tight">GoForm</span>
              </Link>
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
