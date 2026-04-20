"use server";

import { db } from "@/db";
import { assets, users } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq, and, isNull, isNotNull, sum, count, desc } from "drizzle-orm";
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
      .where(type ? and(conditions, eq(assets.type, type)) : conditions)
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
  data?: { totalBytes: number; totalFiles: number; byType: Record<string, { bytes: number; count: number }> };
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
        totalBytes: sum(assets.size),
        totalFiles: count(assets.id),
      })
      .from(assets)
      .where(conditions)
      .groupBy(assets.type);

    const byType: Record<string, { bytes: number; count: number }> = {};
    let totalBytes = 0;
    let totalFiles = 0;

    for (const row of rows) {
      const bytes = Number(row.totalBytes ?? 0);
      const cnt = Number(row.totalFiles ?? 0);
      byType[row.type] = { bytes, count: cnt };
      totalBytes += bytes;
      totalFiles += cnt;
    }

    return { success: true, data: { totalBytes, totalFiles, byType } };
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

    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_SIZE) throw new Error("File size must be under 50 MB");

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
