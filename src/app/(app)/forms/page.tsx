import { getForms } from "@/lib/actions/forms";
import { getUserOrganizations } from "@/lib/actions/organizations";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { FormsListClient } from "./_components/forms-list-client";

export default async function FormsPage() {
  const [result, orgsResult] = await Promise.all([
    getForms(),
    getUserOrganizations()
  ]);
  
  const forms = result.success && result.data ? result.data : [];
  
  const workspaces = [
    { id: PERSONAL_WORKSPACE_ID, name: "Personal Workspace", type: "personal" }
  ];

  if (orgsResult.success && orgsResult.data) {
    orgsResult.data.forEach((org: any) => {
      // For moving, show any org where they are administrator or owner
      if (org.role === "owner" || org.role === "administrator") {
        workspaces.push({
          id: org.id,
          name: org.name,
          type: "organization"
        });
      }
    });
  }

  return <FormsListClient initialForms={forms} targetWorkspaces={workspaces} />;
}
