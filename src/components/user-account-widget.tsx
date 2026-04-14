"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { Users, LogOut, Loader2, Settings as SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getCurrentUserProfile } from "@/lib/actions/users";

export function UserAccountWidget({
  handleNavigation,
  isPending,
  pendingHref,
  pathname,
}: {
  handleNavigation?: (href: string) => void;
  isPending?: boolean;
  pendingHref?: string | null;
  pathname?: string;
}) {
  const [user, setUser] = useState<{
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null>(null);

  const isLoading = isPending && pendingHref === "/settings";
  const isActive = isPending 
    ? pendingHref === "/settings" 
    : pathname === "/settings";

  useEffect(() => {
    const supabase = createClient();
    
    // 1. Get profile from Database (Source of Truth)
    getCurrentUserProfile().then((result) => {
      if (result.success && result.data) {
        setUser({
          name: result.data.name,
          email: result.data.email,
          avatarUrl: result.data.avatarUrl,
        });
      }
    });

    // 2. Listen for auth state changes (e.g., login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any | null) => {
      if (session?.user) {
        // Re-fetch from DB when session changes to ensure latest data
        getCurrentUserProfile().then((result) => {
          if (result.success && result.data) {
            setUser({
              name: result.data.name,
              email: result.data.email,
              avatarUrl: result.data.avatarUrl,
            });
          }
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className={cn(
      "flex w-full items-center gap-1 group/user rounded-lg p-1 transition-colors",
      isActive ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "hover:bg-sidebar-accent/50"
    )}>
      <button 
        onClick={() => handleNavigation?.("/settings")}
        className="flex flex-1 items-center gap-2 p-1 text-sm font-medium overflow-hidden outline-hidden ring-sidebar-ring focus-visible:ring-2"
        title="Settings"
      >
        <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border/50">
          <AvatarImage src={user?.avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
            {user?.name ? (
              user.name.charAt(0).toUpperCase()
            ) : (
              <Users className="size-4" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-1 items-center min-w-0 gap-1.5 overflow-hidden">
          <span className="truncate font-medium shrink min-w-0">
            {user?.name || "User"}
          </span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          ) : (
            <SettingsIcon className="h-4 w-4 shrink-0" />
          )}
        </div>
      </button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            title="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of GoForm?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign back in to access your dashboard and forms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={signOutAction}>
              <AlertDialogAction
                type="submit"
                variant="destructive"
              >
                Log out
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
