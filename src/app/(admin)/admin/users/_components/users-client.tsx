"use client";

import React, { useState, useTransition } from "react";
import { adminUpdateUserRole, type AdminUser } from "@/lib/actions/admin";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, Loader2, FileText, ShieldCheck, Shield, User } from "lucide-react";
import type { UserRole } from "@/db/schema";

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

function RoleSelector({
  userId,
  currentRole,
  onRoleChanged,
}: {
  userId: string;
  currentRole: UserRole;
  onRoleChanged: (userId: string, newRole: UserRole) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState<UserRole>(currentRole);

  const handleChange = (newRole: UserRole) => {
    setValue(newRole);
    startTransition(async () => {
      const result = await adminUpdateUserRole(userId, newRole);
      if (result.success) {
        onRoleChanged(userId, newRole);
        toast.success("Role updated successfully");
      } else {
        setValue(currentRole); // revert on error
        toast.error(result.error ?? "Failed to update role");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(v) => handleChange(v as UserRole)}
        disabled={isPending}
      >
        <SelectTrigger
          className="h-7 w-[130px] text-xs"
          aria-label="Change role"
        >
          {isPending ? (
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving…</span>
            </div>
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user" className="text-xs">
            <span className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              User
            </span>
          </SelectItem>
          <SelectItem value="admin" className="text-xs">
            <span className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-blue-500" />
              Admin
            </span>
          </SelectItem>
          <SelectItem value="superadmin" className="text-xs">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-500" />
              Super Admin
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function UsersClient({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const [localUsers, setLocalUsers] = useState<AdminUser[]>(users);

  const filtered = query.trim()
    ? localUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(query.toLowerCase()) ||
          (u.name ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : localUsers;

  const handleRoleChanged = (userId: string, newRole: UserRole) => {
    setLocalUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
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
          className="pl-9 h-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-12" />
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead className="hidden sm:table-cell text-center w-24">Forms</TableHead>
              <TableHead className="w-40 text-right">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground text-sm"
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
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      {user.avatarUrl && (
                        <AvatarImage src={user.avatarUrl} alt={user.name ?? ""} />
                      )}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {user.name ?? (
                          <span className="text-muted-foreground italic">
                            No name
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {joinedDate}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {user.formCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <RoleSelector
                      userId={user.id}
                      currentRole={user.role}
                      onRoleChanged={handleRoleChanged}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {filtered.length} of {localUsers.length} users
        </p>
      )}
    </div>
  );
}

