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
