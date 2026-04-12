"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { Users, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export function UserAccountWidget() {
  const [user, setUser] = useState<{
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null>(null);

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
    <div className="flex w-full items-center justify-between overflow-hidden">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatarUrl || undefined} />
          <AvatarFallback>
            {user?.name ? (
              user.name.charAt(0).toUpperCase()
            ) : (
              <Users className="size-4" />
            )}
          </AvatarFallback>
        </Avatar>
        <span className="truncate max-w-[130px]">
          {user?.name || user?.email || "Loading..."}
        </span>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
