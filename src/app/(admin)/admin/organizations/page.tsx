import { adminGetOrganizations } from "@/lib/actions/admin";
import { OrganizationsClient } from "./_components/organizations-client";
import { Suspense } from "react";
import { Building2 } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin: Organizations",
};

export default function OrganizationsPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all organizations across the platform.
          </p>
        </div>
      </div>

      <Suspense fallback={<OrganizationsLoading />}>
        <OrganizationsData />
      </Suspense>
    </div>
  );
}

async function OrganizationsData() {
  const result = await adminGetOrganizations();

  if (!result.success) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
        Error loading organizations: {result.error}
      </div>
    );
  }

  return <OrganizationsClient initialOrganizations={result.data} />;
}

function OrganizationsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-full bg-primary/5 animate-pulse rounded-md" />
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-10 bg-muted/40 animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 border-t border-border animate-pulse" />
        ))}
      </div>
    </div>
  );
}
