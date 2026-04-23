"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/db/schema";

/**
 * Common auth guard for admin actions.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

/**
 * Reads the user's role from the DB (never from JWT/user_metadata, which is
 * user-editable). Throws if the caller is not admin or superadmin.
 */
export async function assertAdmin(): Promise<{ userId: string; role: UserRole }> {
  const authUser = await getAuthUser();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
    columns: { id: true, role: true },
  });

  if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "superadmin")) {
    throw new Error("Forbidden: admin access required");
  }

  return { userId: authUser.id, role: dbUser.role };
}
