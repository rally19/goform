import { adminGetOrganizations } from "@/lib/actions/admin";
import { OrganizationsClient } from "./_components/organizations-client";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";

export const metadata = {
  title: "Organization Management | Admin",
};

export default function OrganizationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all organizations across the platform.
        </p>
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
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
              <div className="h-10 w-10 rounded bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
