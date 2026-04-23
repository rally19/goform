import { adminGetOrganization } from "@/lib/actions/admin";
import { notFound } from "next/navigation";
import { OrganizationEditClient } from "./_client";
import { Building2, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await adminGetOrganization(id);
  if (!result.success || !result.data) return { title: "Edit Organization | Admin" };
  return {
    title: `Admin: Edit ${result.data.name}`,
  };
}

export default function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<OrganizationEditSkeleton />}>
      <OrganizationEditData params={params} />
    </Suspense>
  );
}

async function OrganizationEditData({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await adminGetOrganization(id);

  if (!result.success) {
    if (result.error.includes("not found")) {
      notFound();
    }
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
          Error loading organization: {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3">
        <nav className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <Link href="/admin/organizations" className="hover:text-primary transition-colors">Organizations</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-primary/70">{id}</span>
        </nav>
        
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Edit Organization</h1>
          <p className="text-sm text-muted-foreground">
            Manage members, forms, and settings for <strong>{result.data.name}</strong>.
          </p>
        </div>
      </div>

      <OrganizationEditClient organization={result.data} />
    </div>
  );
}

function OrganizationEditSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading organization details...</p>
    </div>
  );
}
