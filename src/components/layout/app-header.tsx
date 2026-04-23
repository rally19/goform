"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname, useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hideNav = pathname.includes('/forms/') && (
    pathname.endsWith('/edit') || 
    pathname.endsWith('/logic') || 
    pathname.endsWith('/results') || 
    pathname.endsWith('/analytics') || 
    pathname.endsWith('/settings')
  );

  if (hideNav) return null;

  return (
    <header className="flex h-14 items-center border-b border-border px-4 lg:px-6 shrink-0 bg-background/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex-1 flex items-center">
        <SidebarTrigger className="-ml-1" />
      </div>

      <Link
        href="/"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          startTransition(() => {
            router.push("/");
          });
        }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
          <SquarePen className="size-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">FormTo.Link</span>
      </Link>

      <div className="flex-1 flex items-center justify-end">
        <ThemeToggle />
      </div>
    </header>
  );
}
