import { adminGetUser } from "@/lib/actions/admin";
import { UserEditClient } from "./_client";
import { ArrowLeft, UserPen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default function AdminUserEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/users"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Users
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <UserPen className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
            <p className="text-sm text-muted-foreground">
              Modify account details and permissions
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<EditUserSkeleton />}>
        <UserEditWrapper params={params} />
      </Suspense>
    </div>
  );
}

async function UserEditWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await adminGetUser(id);

  if (!result.success) {
    if (result.error === "User not found") notFound();
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
        {result.error ?? "Failed to load user"}
      </div>
    );
  }

  return <UserEditClient user={result.data} />;
}


function EditUserSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-muted rounded-xl" />
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded-md w-full" />
        <div className="h-10 bg-muted rounded-md w-full" />
        <div className="h-10 bg-muted rounded-md w-1/2" />
      </div>
    </div>
  );
}
