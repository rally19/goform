"use server";

import { db } from "@/db";
import { forms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "./utils";
import { cleanupFormResources } from "../forms";
import type { ActionResult } from "@/lib/form-types";

export async function adminDeleteForm(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();

    // 1. Thorough cleanup of files and rooms
    await cleanupFormResources(id);

    // 2. Delete from DB
    await db.delete(forms).where(eq(forms.id, id));

    revalidatePath("/admin/users");
    revalidatePath("/admin/organizations");
    
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
