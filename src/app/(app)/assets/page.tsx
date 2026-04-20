import { getActiveWorkspace } from "@/lib/actions/organizations";
import { getWorkspaceAssets, getWorkspaceStorageUsage } from "@/lib/actions/assets";
import { AssetsClient } from "./assets-client";

export const metadata = {
  title: "Assets – GoForm",
  description: "Manage images, files, and media assets for your workspace",
};

export default async function AssetsPage() {
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
