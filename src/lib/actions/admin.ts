"use server";

import { db } from "@/db";
import { users, forms, organizations, formResponses, userRoleEnum } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq, count, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/db/schema";

// ─── Auth Guard ────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

/**
 * Reads the user's role from the DB (never from JWT/user_metadata, which is
 * user-editable). Throws if the caller is not admin or superadmin.
 */
async function assertAdmin(): Promise<{ userId: string; role: UserRole }> {
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

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function adminGetStats() {
  try {
    await assertAdmin();

    const [
      [usersCount],
      [formsCount],
      [orgsCount],
      [responsesCount],
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(forms),
      db.select({ count: count() }).from(organizations),
      db.select({ count: count() }).from(formResponses),
    ]);

    return {
      success: true,
      data: {
        users: usersCount.count,
        forms: formsCount.count,
        organizations: orgsCount.count,
        responses: responsesCount.count,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── User Management ──────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  formCount: number;
};

export async function adminGetUsers(): Promise<
  { success: true; data: AdminUser[] } | { success: false; error: string }
> {
  try {
    await assertAdmin();

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        formCount: sql<number>`cast(count(${forms.id}) as int)`,
      })
      .from(users)
      .leftJoin(forms, eq(forms.userId, users.id))
      .groupBy(users.id)
      .orderBy(users.createdAt);

    return { success: true, data: rows as AdminUser[] };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Role Update ──────────────────────────────────────────────────────────────

export async function adminUpdateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId: callerId, role: callerRole } = await assertAdmin();

    // Only superadmin can grant superadmin
    if (newRole === "superadmin" && callerRole !== "superadmin") {
      throw new Error("Only a superadmin can grant superadmin role");
    }

    // Prevent self-demotion
    if (targetUserId === callerId && newRole === "user") {
      throw new Error("You cannot remove your own admin role");
    }

    await db
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, targetUserId));

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
