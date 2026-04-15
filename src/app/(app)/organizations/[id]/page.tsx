import { getOrganization, getOrganizationMembers } from "@/lib/actions/organizations";
import { redirect } from "next/navigation";
import { OrganizationManageClient } from "./_client";
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
      ],
      params: { id: 'sample-org-id' }
    }
  ]
};

export default async function OrganizationManagePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<OrgManageSkeleton />}>
      <OrgManageData params={params} />
    </Suspense>
  );
}

async function OrgManageData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [orgRes, membersRes] = await Promise.all([
    getOrganization(id),
    getOrganizationMembers(id)
  ]);

  if (!orgRes.success || !orgRes.data) {
    redirect("/organizations");
  }

  return (
    <OrganizationManageClient 
      organization={orgRes.data}
      initialMembers={membersRes.data?.members || []}
      initialInvites={membersRes.data?.invites || []}
    />
  );
}

function OrgManageSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 border-b">
        <div className="space-y-2">
          <div className="h-9 w-64 bg-primary/5 rounded-md" />
          <div className="h-4 w-48 bg-primary/5 rounded-md" />
        </div>
      </div>
      <div className="grid gap-6">
        <div className="h-64 bg-primary/5 rounded-xl border border-border/50" />
        <div className="h-96 bg-primary/5 rounded-xl border border-border/50" />
      </div>
    </div>
  );
}
