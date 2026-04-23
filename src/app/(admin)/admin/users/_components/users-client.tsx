"use client";

import React, { useState, useTransition } from "react";
import { adminDeleteUser, type AdminUser } from "@/lib/actions/admin";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, Loader2, FileText, ShieldCheck, Shield, User, MoreHorizontal, Pencil, Eye, Trash2, Calendar, Mail } from "lucide-react";
import type { UserRole } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const roleStyles: Record<UserRole, string> = {
  superadmin: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  user: "bg-muted text-muted-foreground border-border",
};

const roleLabels: Record<UserRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  user: "User",
};

const roleIcons: Record<UserRole, React.ElementType> = {
  superadmin: ShieldCheck,
  admin: Shield,
  user: User,
};

function RoleBadge({ role }: { role: UserRole }) {
  const Icon = roleIcons[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
        roleStyles[role]
      )}
    >
      <Icon className="h-3 w-3" />
      {roleLabels[role]}
    </span>
  );
}

export function UsersClient({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const [localUsers, setLocalUsers] = useState<AdminUser[]>(users);
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  // State for View Dialog
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);
  
  // State for Delete Alert
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const filtered = query.trim()
    ? localUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(query.toLowerCase()) ||
          (u.name ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : localUsers;

  const handleDelete = (userId: string) => {
    startDeleteTransition(async () => {
      const result = await adminDeleteUser(userId);
      if (result.success) {
        setLocalUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success("User deleted successfully");
      } else {
        toast.error(result.error ?? "Failed to delete user");
      }
      setDeletingUserId(null);
    });
  };

  const roleCounts = localUsers.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<UserRole, number>
  );

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {(["superadmin", "admin", "user"] as UserRole[]).map((role) => (
          <span
            key={role}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
              roleStyles[role]
            )}
          >
            {React.createElement(roleIcons[role], { className: "h-3 w-3" })}
            {roleLabels[role]}: {roleCounts[role] ?? 0}
          </span>
        ))}
        <span className="inline-flex items-center text-xs text-muted-foreground ml-auto">
          {localUsers.length} total user{localUsers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="user-search"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              <TableHead className="w-12" />
              <TableHead className="text-xs font-semibold uppercase tracking-wider">User</TableHead>
              <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider">Joined</TableHead>
              <TableHead className="hidden sm:table-cell text-center w-24 text-xs font-semibold uppercase tracking-wider">Forms</TableHead>
              <TableHead className="w-32 text-center text-xs font-semibold uppercase tracking-wider">Role</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-16 text-muted-foreground text-sm"
                >
                  {query ? "No users match your search" : "No users found"}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((user) => {
              const initials = (user.name ?? user.email)
                .split(/[\s@]/)
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              const joinedDate = new Date(user.createdAt).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "short", day: "numeric" }
              );

              return (
                <TableRow
                  key={user.id}
                  className="hover:bg-muted/30 transition-colors group border-b border-border last:border-0"
                >
                  <TableCell>
                    <Avatar className="h-8 w-8 border border-border/50 shadow-sm">
                      {user.avatarUrl && (
                        <AvatarImage src={user.avatarUrl} alt={user.name ?? ""} />
                      )}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        {user.name ?? (
                          <span className="text-muted-foreground italic">
                            No name
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {joinedDate}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <FileText className="h-3 w-3" />
                      {user.formCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setViewingUser(user)} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" />
                          <span>View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}/edit`)} className="cursor-pointer">
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingUserId(user.id)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-right font-medium">
          Showing {filtered.length} of {localUsers.length} users
        </p>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Information</DialogTitle>
            <DialogDescription>
              Detailed view of the user profile.
            </DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/10 shadow-md">
                  {viewingUser.avatarUrl && (
                    <AvatarImage src={viewingUser.avatarUrl} />
                  )}
                  <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                    {viewingUser.name ? viewingUser.name.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight">
                    {viewingUser.name || "Anonymous User"}
                  </h3>
                  <RoleBadge role={viewingUser.role} />
                </div>
              </div>

              <div className="grid gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shadow-sm border border-border/50">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email Address</p>
                    <p className="font-medium">{viewingUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shadow-sm border border-border/50">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Joined Date</p>
                    <p className="font-medium">
                      {new Date(viewingUser.createdAt).toLocaleDateString("en-US", {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shadow-sm border border-border/50">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Forms Created</p>
                    <p className="font-medium">{viewingUser.formCount} total forms</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewingUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account from both the database and Supabase Auth.
              All forms and responses owned by this user will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => deletingUserId && handleDelete(deletingUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


