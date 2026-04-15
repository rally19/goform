import { getUserOrganizations, getActiveWorkspace } from "@/lib/actions/organizations";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { OrganizationsClient } from "./_client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const unstable_instant = { prefetch: 'static' };

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
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading organizations...</p>
    </div>
  );
}
