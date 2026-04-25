"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/form-types";
import type { UserRole } from "@/db/schema";

export async function getCurrentUserProfile(): Promise<ActionResult<{
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    return {
      success: true,
      data: {
        id: user.id,
        name: dbUser?.name || user.user_metadata?.name || user.user_metadata?.full_name || null,
        email: user.email!,
        avatarUrl: dbUser?.avatarUrl || user.user_metadata?.avatar_url || null,
        role: dbUser?.role ?? "user",
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

import { assets, forms } from "@/db/schema";
import { and, isNull } from "drizzle-orm";
import { cleanupFormResources } from "./forms";

/**
 * Internal helper to clean up all external resources associated with a user
 * (Assets, Form Uploads, Liveblocks rooms, Profile Avatar).
 */
export async function cleanupUserResources(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, avatarUrl: true },
    });
    if (!user) return;

    const supabase = await createClient();
    const assetsBucket = "goform-assets";
    const profileBucket = "embersatu";

    // 1. Clean up Profile Avatar
    if (user.avatarUrl) {
      try {
        const isAssetsBucket = user.avatarUrl.includes(assetsBucket);
        const isProfileBucket = user.avatarUrl.includes(profileBucket);
        const bucket = isAssetsBucket ? assetsBucket : isProfileBucket ? profileBucket : null;
        
        if (bucket) {
          const path = user.avatarUrl.split(`${bucket}/`)[1];
          if (path) await supabase.storage.from(bucket).remove([path]);
        }
      } catch (e) {}
    }

    // 2. Clean up Personal Assets (in goform-assets bucket)
    const userAssets = await db.query.assets.findMany({
      where: eq(assets.userId, userId),
      columns: { storagePath: true },
    });
    if (userAssets.length > 0) {
      try {
        const paths = userAssets.map((a) => a.storagePath);
        await supabase.storage.from(assetsBucket).remove(paths);
      } catch (e) {}
    }

    // 3. Clean up Personal Forms (Files + Liveblocks)
    const personalForms = await db.query.forms.findMany({
      where: and(eq(forms.userId, userId), isNull(forms.organizationId)),
      columns: { id: true },
    });
    for (const form of personalForms) {
      await cleanupFormResources(form.id);
    }
  } catch (err) {
    console.error(`Cleanup failed for user ${userId}:`, err);
  }
}
