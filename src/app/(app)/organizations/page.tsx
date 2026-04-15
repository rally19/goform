import { getUserOrganizations, getActiveWorkspace } from "@/lib/actions/organizations";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { OrganizationsClient } from "./_client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const unstable_instant = { 
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'goform_workspace', value: null },
        { name: 'sb-access-token', value: null },
        { name: 'sb-refresh-token', value: null }
      ]
    }
  ]
};

export default async function OrganizationsPage() {
  return (
    <Suspense fallback={<OrganizationsSkeleton />}>
      <OrganizationsData />
    </Suspense>
  );
}

async function OrganizationsData() {
  const [orgsResult, activeWorkspace, userResult] = await Promise.all([
    getUserOrganizations(),
    getActiveWorkspace(),
    getCurrentUserProfile()
  ]);

  const organizations = orgsResult.success && orgsResult.data ? orgsResult.data : [];
  const userAvatar = (userResult.success && userResult.data) ? userResult.data.avatarUrl : null;

  return (
    <OrganizationsClient 
      organizations={organizations} 
      activeWorkspaceId={activeWorkspace}
      userAvatar={userAvatar}
    />
  );
}

function OrganizationsSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div className="space-y-2">
          <div className="h-9 w-48 bg-primary/5 rounded-md" />
          <div className="h-4 w-64 bg-primary/5 rounded-md" />
        </div>
        <div className="h-10 w-44 bg-primary/5 rounded-md" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-full bg-primary/5 border border-border" />
              {i === 1 && <div className="h-6 w-16 bg-primary/10 rounded-full" />}
            </div>
            <div className="space-y-2">
              <div className="h-5 w-2/3 bg-primary/5 rounded-md" />
              <div className="h-4 w-full bg-primary/5 rounded-md" />
            </div>
            <div className="pt-4 flex items-center justify-between border-t border-border/50">
              <div className="h-5 w-16 bg-primary/5 rounded-full" />
              <div className="h-8 w-20 bg-primary/5 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
