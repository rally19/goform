import { getUserOrganizations, getActiveWorkspace } from "@/lib/actions/organizations";
import { OrganizationsClient } from "./_client";

export default async function OrganizationsPage() {
  const [orgsResult, activeWorkspace] = await Promise.all([
    getUserOrganizations(),
    getActiveWorkspace()
  ]);

  const organizations = orgsResult.success && orgsResult.data ? orgsResult.data : [];

  return (
    <OrganizationsClient 
      organizations={organizations} 
      activeWorkspaceId={activeWorkspace}
    />
  );
}
