import { adminGetUsers } from "@/lib/actions/admin";
import { UsersClient } from "./_components/users-client";
import { Users } from "lucide-react";
import { Suspense } from "react";

export default function AdminUsersPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Users className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage all user accounts and their roles
          </p>
        </div>
      </div>

      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersListWrapper />
      </Suspense>
    </div>
  );
}

async function UsersListWrapper() {
  const result = await adminGetUsers();

  if (!result.success) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
        {result.error ?? "Failed to load users"}
      </div>
    );
  }

  return <UsersClient users={result.data} />;
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-full bg-primary/5 animate-pulse rounded-md" />
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-10 bg-muted/40 animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 border-t border-border animate-pulse" />
        ))}
      </div>
    </div>
  );
}

