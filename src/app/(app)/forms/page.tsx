import { getForms } from "@/lib/actions/forms";
import { getUserOrganizations } from "@/lib/actions/organizations";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { FormsListClient } from "./_components/forms-list-client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const unstable_instant = { 
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'goform_workspace', value: null },
        { name: 'sb-access-token', value: null },
        { name: 'sb-refresh-token', value: null },
        { name: 'sidebar_state', value: null }
      ]
    }
  ]
};

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
    <div className="flex-1 p-4 pt-6 md:p-8 space-y-6 overflow-y-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-primary/5 rounded-md" />
          <div className="h-4 w-48 bg-primary/5 rounded-md" />
        </div>
        <div className="h-10 w-32 bg-primary/5 rounded-md" />
      </div>

      {/* Search + Filter Skeleton */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="h-10 flex-1 bg-primary/5 rounded-md" />
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 bg-primary/5 rounded-md" />
          ))}
        </div>
      </div>

      {/* List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/50">
            <div className="h-4 w-4 bg-primary/5 rounded border border-border" />
            <div className="h-9 w-9 bg-primary/5 rounded-lg border border-border" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-primary/5 rounded-md" />
              <div className="flex gap-4">
                <div className="h-4 w-16 bg-primary/5 rounded-full" />
                <div className="h-4 w-24 bg-primary/5 rounded-md" />
              </div>
            </div>
            <div className="h-8 w-8 bg-primary/5 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
