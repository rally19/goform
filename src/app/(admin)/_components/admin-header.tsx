"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldCheck } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="flex h-14 items-center border-b border-border px-4 lg:px-6 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex-1 flex items-center">
        <SidebarTrigger className="-ml-1" />
      </div>

      {/* <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
          <ShieldCheck className="size-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Admin Console</span>
      </div> */}

      <div className="flex-1 flex items-center justify-end">
        <ThemeToggle />
      </div>
    </header>
  );
}
