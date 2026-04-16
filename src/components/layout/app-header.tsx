"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();

  const hideNav = pathname.includes('/forms/') && (
    pathname.endsWith('/edit') || 
    pathname.endsWith('/results') || 
    pathname.endsWith('/analytics') || 
    pathname.endsWith('/settings')
  );

  if (hideNav) return null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
