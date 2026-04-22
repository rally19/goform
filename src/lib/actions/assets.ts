"use server";

import { db } from "@/db";
import { assets, users } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq, and, isNull, isNotNull, sum, count, desc, notIlike, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { verifyWorkspaceAccess } from "./organizations";
import type { Asset } from "@/db/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

function detectAssetType(
  mimeType: string
): "image" | "video" | "document" | "audio" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation") ||
    mimeType.includes("text/")
  )
    return "document";
  return "other";
}

function generateStoragePath(
  workspaceId: string,
  userId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const ext = fileName.split(".").pop() ?? "bin";
  const base = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, "_");
  return `${workspaceId}/${userId}/${timestamp}_${base}.${ext}`;
}

const ASSETS_BUCKET = "goform-assets";

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getWorkspaceAssets(
  workspaceId: string,
  options: {
    type?: "image" | "video" | "document" | "audio" | "other";
    limit?: number;
    offset?: number;
  } = {}
) {
  try {
    const user = await getAuthUser();
    const { type, limit = 50, offset = 0 } = options;

    const isPersonal = workspaceId === PERSONAL_WORKSPACE_ID;

    // Verify access for org workspaces
    if (!isPersonal) {
      const access = await verifyWorkspaceAccess(workspaceId, "viewer");
      if (!access.success) throw new Error(access.error);
    }

    const conditions = isPersonal
      ? and(isNull(assets.organizationId), eq(assets.userId, user.id))
      : and(
          isNotNull(assets.organizationId),
          eq(assets.organizationId, workspaceId)
        );

    const query = db
      .select()
      .from(assets)
      .where(type ? and(conditions, eq(assets.type, type), notIlike(assets.storagePath, 'forms/%')) : and(conditions, notIlike(assets.storagePath, 'forms/%')))
      .orderBy(desc(assets.createdAt))
      .limit(limit)
      .offset(offset);

    const rows = await query;
    return { success: true, data: rows as Asset[] };
  } catch (err) {
    return { success: false, error: (err as Error).message, data: [] };
  }
}

export async function getWorkspaceStorageUsage(workspaceId: string): Promise<{
  success: boolean;
  data?: { 
    totalBytes: number; 
    totalFiles: number; 
    assetBytes: number;
    assetFiles: number;
    formBytes: number;
    formFiles: number;
    byType: Record<string, { bytes: number; count: number }> 
  };
  error?: string;
}> {
  try {
    const user = await getAuthUser();
    const isPersonal = workspaceId === PERSONAL_WORKSPACE_ID;

    if (!isPersonal) {
      const access = await verifyWorkspaceAccess(workspaceId, "viewer");
      if (!access.success) throw new Error(access.error);
    }

    const conditions = isPersonal
      ? and(isNull(assets.organizationId), eq(assets.userId, user.id))
      : and(
          isNotNull(assets.organizationId),
          eq(assets.organizationId, workspaceId)
        );

    const rows = await db
      .select({
        type: assets.type,
        isForm: sql<boolean>`${assets.storagePath} LIKE 'forms/%'`,
        totalBytes: sum(assets.size),
        totalFiles: count(assets.id),
      })
      .from(assets)
      .where(conditions)
      .groupBy(assets.type, sql`${assets.storagePath} LIKE 'forms/%'`);

    const byType: Record<string, { bytes: number; count: number }> = {};
    let totalBytes = 0;
    let totalFiles = 0;
    let assetBytes = 0;
    let assetFiles = 0;
    let formBytes = 0;
    let formFiles = 0;

    for (const row of rows) {
      const bytes = Number(row.totalBytes ?? 0);
      const cnt = Number(row.totalFiles ?? 0);
      
      totalBytes += bytes;
      totalFiles += cnt;

      if (row.isForm) {
        formBytes += bytes;
        formFiles += cnt;
      } else {
        assetBytes += bytes;
        assetFiles += cnt;
        // Only track byType for regular assets to keep gallery stats clean
        if (!byType[row.type]) byType[row.type] = { bytes: 0, count: 0 };
        byType[row.type].bytes += bytes;
        byType[row.type].count += cnt;
      }
    }

    return { success: true, data: { totalBytes, totalFiles, assetBytes, assetFiles, formBytes, formFiles, byType } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadAsset(workspaceId: string, formData: FormData) {
  try {
    const user = await getAuthUser();
    const isPersonal = workspaceId === PERSONAL_WORKSPACE_ID;

    if (!isPersonal) {
      const access = await verifyWorkspaceAccess(workspaceId, "editor");
      if (!access.success) throw new Error(access.error);
    }

    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No file provided");

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) throw new Error("File size must be under 5 MB");

    // Check workspace limits
    const usage = await getWorkspaceStorageUsage(workspaceId);
    const currentBytes = usage.data?.totalBytes ?? 0;
    if (currentBytes + file.size > 100 * 1024 * 1024) {
      throw new Error("Workspace storage limit of 100 MB reached");
    }

    // Ensure user exists in DB
    await db
      .insert(users)
      .values({ id: user.id, email: user.email! })
      .onConflictDoNothing();

    const supabase = await createClient();
    const storagePath = generateStoragePath(workspaceId, user.id, file.name);

    const { error: uploadError } = await supabase.storage
      .from(ASSETS_BUCKET)
      .upload(storagePath, file, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from(ASSETS_BUCKET)
      .getPublicUrl(storagePath);

    const mimeType = file.type || "application/octet-stream";
    const assetType = detectAssetType(mimeType);
    const displayName = formData.get("name") as string | null;

    const [asset] = await db
      .insert(assets)
      .values({
        userId: isPersonal ? user.id : null,
        organizationId: isPersonal ? null : workspaceId,
        name: displayName?.trim() || file.name,
        originalName: file.name,
        mimeType,
        size: file.size,
        type: assetType,
        storagePath,
        url: urlData.publicUrl,
        uploadedBy: user.id,
      })
      .returning();

    revalidatePath("/assets");
    return { success: true, data: asset as Asset };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteAsset(assetId: string) {
  try {
    const user = await getAuthUser();

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });

    if (!asset) throw new Error("Asset not found");

    // Permission check
    if (asset.organizationId) {
      const access = await verifyWorkspaceAccess(
        asset.organizationId,
        "editor"
      );
      if (!access.success) throw new Error(access.error);
    } else if (asset.userId !== user.id) {
      throw new Error("You do not have permission to delete this asset");
    }

    // Delete from storage
    const supabase = await createClient();
    const { error: storageError } = await supabase.storage
      .from(ASSETS_BUCKET)
      .remove([asset.storagePath]);

    if (storageError) {
      console.error("Storage delete error:", storageError.message);
      // Continue to DB delete even if storage fails (orphan cleanup)
    }

    await db.delete(assets).where(eq(assets.id, assetId));

    revalidatePath("/assets");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Rename ───────────────────────────────────────────────────────────────────

export async function renameAsset(assetId: string, name: string) {
  try {
    const user = await getAuthUser();

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });

    if (!asset) throw new Error("Asset not found");

    if (asset.organizationId) {
      const access = await verifyWorkspaceAccess(asset.organizationId, "editor");
      if (!access.success) throw new Error(access.error);
    } else if (asset.userId !== user.id) {
      throw new Error("You do not have permission to rename this asset");
    }

    const [updated] = await db
      .update(assets)
      .set({ name: name.trim() })
      .where(eq(assets.id, assetId))
      .returning();

    revalidatePath("/assets");
    return { success: true, data: updated as Asset };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Bulk Delete ──────────────────────────────────────────────────────────────

export async function deleteAssets(assetIds: string[]) {
  try {
    const user = await getAuthUser();
    if (assetIds.length === 0) return { success: true };

    const rows = await db.query.assets.findMany({
      where: (a, { inArray }) => inArray(a.id, assetIds),
    });

    // Permission check for every asset
    for (const asset of rows) {
      if (asset.organizationId) {
        const access = await verifyWorkspaceAccess(asset.organizationId, "editor");
        if (!access.success) throw new Error(`No permission to delete "${asset.name}"`);
      } else if (asset.userId !== user.id) {
        throw new Error(`No permission to delete "${asset.name}"`);
      }
    }

    // Delete from storage (best-effort)
    const supabase = await createClient();
    const paths = rows.map((r) => r.storagePath);
    if (paths.length > 0) {
      const { error } = await supabase.storage.from(ASSETS_BUCKET).remove(paths);
      if (error) console.error("Storage bulk-delete error:", error.message);
    }

    const { inArray } = await import("drizzle-orm");
    await db.delete(assets).where(inArray(assets.id, assetIds));

    revalidatePath("/assets");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Bulk Move ────────────────────────────────────────────────────────────────

export async function moveAssets(
  assetIds: string[],
  targetWorkspaceId: string
) {
  try {
    const user = await getAuthUser();
    if (assetIds.length === 0) return { success: true };

    const isTargetPersonal = targetWorkspaceId === PERSONAL_WORKSPACE_ID;

    // Verify access to target workspace
    if (!isTargetPersonal) {
      const access = await verifyWorkspaceAccess(targetWorkspaceId, "editor");
      if (!access.success) throw new Error("No permission to move assets to that workspace");
    }

    const rows = await db.query.assets.findMany({
      where: (a, { inArray }) => inArray(a.id, assetIds),
    });

    // Verify edit access for every source asset
    for (const asset of rows) {
      if (asset.organizationId) {
        const access = await verifyWorkspaceAccess(asset.organizationId, "editor");
        if (!access.success) throw new Error(`No permission to move "${asset.name}"`);
      } else if (asset.userId !== user.id) {
        throw new Error(`No permission to move "${asset.name}"`);
      }
    }

    const { inArray } = await import("drizzle-orm");
    await db
      .update(assets)
      .set({
        userId: isTargetPersonal ? user.id : null,
        organizationId: isTargetPersonal ? null : targetWorkspaceId,
      })
      .where(inArray(assets.id, assetIds));

    revalidatePath("/assets");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Bulk Copy ────────────────────────────────────────────────────────────────

export async function copyAssets(
  assetIds: string[],
  targetWorkspaceId: string
) {
  try {
    const user = await getAuthUser();
    if (assetIds.length === 0) return { success: true };

    const isTargetPersonal = targetWorkspaceId === PERSONAL_WORKSPACE_ID;

    // Verify access to target workspace
    if (!isTargetPersonal) {
      const access = await verifyWorkspaceAccess(targetWorkspaceId, "editor");
      if (!access.success) throw new Error("No permission to copy assets to that workspace");
    }

    const rows = await db.query.assets.findMany({
      where: (a, { inArray }) => inArray(a.id, assetIds),
    });

    // Verify read access for every source asset
    for (const asset of rows) {
      if (asset.organizationId) {
        const access = await verifyWorkspaceAccess(asset.organizationId, "viewer");
        if (!access.success) throw new Error(`No permission to read "${asset.name}"`);
      } else if (asset.userId !== user.id) {
        throw new Error(`No permission to read "${asset.name}"`);
      }
    }

    const supabase = await createClient();

    // Copy each asset
    for (const asset of rows) {
      // For generateStoragePath, we need to pass PERSONAL_WORKSPACE_ID or the org id.
      // But generateStoragePath uses the workspaceId to prefix the path.
      // We will use the targetWorkspaceId for the prefix.
      const targetPathPrefix = isTargetPersonal ? "personal" : targetWorkspaceId;
      const newStoragePath = generateStoragePath(targetPathPrefix, user.id, asset.originalName);

      const { error: copyError } = await supabase.storage
        .from(ASSETS_BUCKET)
        .copy(asset.storagePath, newStoragePath);

      if (copyError) {
        console.error("Storage copy error for", asset.name, ":", copyError.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from(ASSETS_BUCKET)
        .getPublicUrl(newStoragePath);

      await db.insert(assets).values({
        userId: isTargetPersonal ? user.id : null,
        organizationId: isTargetPersonal ? null : targetWorkspaceId,
        name: asset.name + " (Copy)",
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        size: asset.size,
        type: asset.type,
        storagePath: newStoragePath,
        url: urlData.publicUrl,
        uploadedBy: user.id,
      });
    }

    revalidatePath("/assets");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

