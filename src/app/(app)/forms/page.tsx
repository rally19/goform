import { getForms } from "@/lib/actions/forms";
import { getUserOrganizations } from "@/lib/actions/organizations";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { FormsListClient } from "./_components/forms-list-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const unstable_instant = { prefetch: 'static' };

export default async function FormsPage() {
  return (
    <Suspense fallback={<FormsListSkeleton />}>
      <FormsListData />
    </Suspense>
  );
}

async function FormsListData() {
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
      if (org.role === "owner" || org.role === "manager" || org.role === "administrator") {
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

function FormsListSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading forms...</p>
    </div>
  );
}
