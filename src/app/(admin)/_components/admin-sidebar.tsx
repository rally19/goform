"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserRole } from "@/db/schema";
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
import { UserAccountWidget } from "@/components/user-account-widget";

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { name: "Users", href: "/admin/users", icon: Users, exact: false },
  { name: "Organizations", href: "/admin/organizations", icon: Building2, exact: false },
];

export function AdminSidebar({
  userRole,
  userName,
  userEmail,
  userAvatarUrl,
}: {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
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

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader className="h-14 flex flex-col justify-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              Admin Panel
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 font-mono truncate">
              goform.app
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isLoading = isPending && pendingHref === item.href;
                const isActive = isPending 
                  ? pendingHref === item.href 
                  : item.exact 
                    ? pathname === item.href 
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

        <SidebarGroup>
          <SidebarGroupLabel>App</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link 
                    href="/dashboard"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation("/dashboard");
                    }}
                  >
                    {pendingHref === "/dashboard" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <ArrowLeft />
                    )}
                    <span>Back to App</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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



