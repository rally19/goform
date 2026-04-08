"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { Users, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function UserAccountWidget() {
  const [user, setUser] = useState<{
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        setUser({
          name: authUser.user_metadata?.name || null,
          email: authUser.email!,
          avatarUrl: authUser.user_metadata?.avatar_url || null,
        });
      }
    });
  }, []);

  return (
    <div className="flex w-full items-center justify-between overflow-hidden">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatarUrl || ""} />
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
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Log out"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
