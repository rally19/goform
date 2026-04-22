import { adminGetStats, adminGetUsers } from "@/lib/actions/admin";
import {
  Users,
  FileText,
  Building2,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

const roleStyles: Record<string, string> = {
  superadmin: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  admin: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  user: "bg-muted text-muted-foreground border-border",
};

const roleLabels: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  user: "User",
};

export default function AdminOverviewPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">
            System-wide metrics and recent activity
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <Suspense fallback={<AdminStatsSkeleton />}>
        <AdminStats />
      </Suspense>

      {/* Recent Users */}
      <Suspense fallback={<AdminRecentUsersSkeleton />}>
        <AdminRecentUsers />
      </Suspense>
    </div>
  );
}

async function AdminStats() {
  const statsResult = await adminGetStats();
  const stats = statsResult.success ? statsResult.data : null;

  const statCards = [
    {
      title: "Total Users",
      value: stats?.users ?? 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      description: "Registered accounts",
    },
    {
      title: "Total Forms",
      value: stats?.forms ?? 0,
      icon: FileText,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      description: "Forms created",
    },
    {
      title: "Organizations",
      value: stats?.organizations ?? 0,
      icon: Building2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      description: "Active workspaces",
    },
    {
      title: "Responses",
      value: stats?.responses ?? 0,
      icon: MessageSquare,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      description: "Form submissions",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <Card
          key={card.title}
          className="relative overflow-hidden border-border/60 hover:border-border transition-colors"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {card.title}
              </p>
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  card.bg
                )}
              >
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold tabular-nums">
                {card.value.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function AdminRecentUsers() {
  const usersResult = await adminGetUsers();
  const recentUsers = usersResult.success
    ? [...usersResult.data]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 6)
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Recent Users</h2>
          <p className="text-sm text-muted-foreground">
            Newest accounts on the platform
          </p>
        </div>
        <Link
          href="/admin/users"
          className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
        >
          View all
          <TrendingUp className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {recentUsers.map((user) => {
          const initials = (user.name ?? user.email)
            .split(/[\s@]/)
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-border transition-colors"
            >
              <Avatar className="h-9 w-9 shrink-0">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                    roleStyles[user.role]
                  )}
                >
                  {roleLabels[user.role]}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {user.formCount} form{user.formCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {recentUsers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          No users found
        </div>
      )}
    </div>
  );
}

function AdminStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="h-20" />
          <CardContent className="h-16" />
        </Card>
      ))}
    </div>
  );
}

function AdminRecentUsersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-48 bg-primary/5 animate-pulse rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-16 bg-primary/5 animate-pulse rounded-xl border border-border/60"
          />
        ))}
      </div>
    </div>
  );
}

