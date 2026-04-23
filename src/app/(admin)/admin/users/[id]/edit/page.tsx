import { adminGetUser } from "@/lib/actions/admin";
import { UserEditClient } from "./_client";
import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Edit User | Admin",
};

export default function AdminUserEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditUserSkeleton />}>
      <UserEditWrapper params={params} />
    </Suspense>
  );
}

async function UserEditWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await adminGetUser(id);

  if (!result.success) {
    if (result.error === "User not found") notFound();
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
          Error loading user: {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3">
        <nav className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <Link href="/admin/users" className="hover:text-primary transition-colors">Users</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary/70">{id}</span>
        </nav>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
          <p className="text-sm text-muted-foreground">
            Manage account details, permissions, and forms for <strong>{result.data.name || result.data.email}</strong>.
          </p>
        </div>
      </div>

      <UserEditClient user={result.data} />
    </div>
  );
}

function EditUserSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading user details...</p>
    </div>
  );
}
