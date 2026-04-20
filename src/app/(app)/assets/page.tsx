import { Suspense } from "react";
import { getActiveWorkspace } from "@/lib/actions/organizations";
import { getWorkspaceAssets, getWorkspaceStorageUsage } from "@/lib/actions/assets";
import { AssetsClient } from "./assets-client";
import { Skeleton } from "@/components/ui/skeleton";
import { HardDrive } from "lucide-react";

export const metadata = {
  title: "Assets – GoForm",
  description: "Manage images, files, and media assets for your workspace",
};

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      cookies: [
        { name: "goform_workspace", value: null },
        { name: "sb-access-token", value: null },
        { name: "sb-refresh-token", value: null },
        { name: "sidebar_state", value: null },
      ],
    },
  ],
};

export default function AssetsPage() {
  return (
    <Suspense fallback={<AssetsPageSkeleton />}>
      <AssetsPageContent />
    </Suspense>
  );
}

async function AssetsPageContent() {
  const workspaceId = await getActiveWorkspace();

  const [assetsResult, usageResult] = await Promise.all([
    getWorkspaceAssets(workspaceId),
    getWorkspaceStorageUsage(workspaceId),
  ]);

  return (
    <AssetsClient
      workspaceId={workspaceId}
      initialAssets={assetsResult.data ?? []}
      usage={
        usageResult.success && usageResult.data
          ? usageResult.data
          : { totalBytes: 0, totalFiles: 0, byType: {} }
      }
    />
  );
}

function AssetsPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="border-b border-border bg-background/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48 rounded-md" />
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-2 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
