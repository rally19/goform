"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActiveUser {
  userId: string;
  name: string;
  color: string;
  presenceKey: string;
  avatarUrl?: string;
}

interface ActiveUsersDialogProps {
  activeUsers: ActiveUser[];
  children: React.ReactNode;
}

export function ActiveUsersDialog({ activeUsers, children }: ActiveUsersDialogProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Users ({activeUsers.length})
          </DialogTitle>
          <DialogDescription>
            Currently editing this form
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {activeUsers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active users</p>
            </div>
          ) : (
            activeUsers.map((user) => (
              <div
                key={user.presenceKey}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
              >
                <Avatar className="h-10 w-10">
                  {user.avatarUrl ? (
                    <AvatarImage 
                      src={user.avatarUrl} 
                      alt={user.name}
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <AvatarFallback 
                    style={{ backgroundColor: user.color }}
                    className={`text-white font-semibold ${user.avatarUrl ? 'hidden' : ''}`}
                  >
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground">Currently editing</p>
                </div>
                
                <div className="flex items-center gap-1">
                  <div 
                    className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
                    title="Active"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
