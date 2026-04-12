import { getUserOrganizations, getActiveWorkspace } from "@/lib/actions/organizations";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { OrganizationsClient } from "./_client";

export default async function OrganizationsPage() {
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
