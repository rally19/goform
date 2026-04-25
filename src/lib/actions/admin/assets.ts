"use server";

import { db } from "@/db";
import { assets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "./utils";
import { createClient } from "@/lib/server";
import type { ActionResult } from "@/lib/form-types";

export async function adminDeleteAsset(assetId: string): Promise<ActionResult> {
  try {
    await assertAdmin();

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
    });

    if (!asset) throw new Error("Asset not found");

    // Safety check: Only delete if it's an asset, not a form upload
    // Form uploads are managed via cleanupFormResources and follow the forms/{id}/ structure
    if (asset.storagePath.startsWith("forms/")) {
      throw new Error("This is a form upload. It can only be deleted by deleting the form or clearing responses.");
    }

    const supabase = await createClient();
    
    // Assets are in the goform-assets bucket
    const { error: storageError } = await supabase.storage
      .from("goform-assets")
      .remove([asset.storagePath]);

    if (storageError) {
      console.error(`Storage cleanup failed for asset ${assetId}:`, storageError.message);
    }

    await db.delete(assets).where(eq(assets.id, assetId));

    revalidatePath("/admin/users");
    revalidatePath("/admin/organizations");
    
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
