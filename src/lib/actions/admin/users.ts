"use server";

import { db } from "@/db";
import { users, forms, assets, organizations, organizationMembers } from "@/db/schema";
import { eq, count, sql, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/server";
import type { UserRole } from "@/db/schema";
import { assertAdmin } from "./utils";

// ─── User Management Types ───────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  emailVerifiedAt: Date | null;
  formCount: number;
  lastSignInAt?: string | null;
  confirmedAt?: string | null;
  appMetadata?: any;
  userMetadata?: any;
  forms?: {
    id: string;
    title: string;
    slug: string;
    status: string;
    createdAt: Date;
    responsesCount: number;
  }[];
};

// ─── User Management Actions ──────────────────────────────────────────────────

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
        emailVerifiedAt: users.emailVerifiedAt,
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

export async function adminGetUser(id: string): Promise<
  { success: true; data: AdminUser } | { success: false; error: string }
> {
  try {
    await assertAdmin();

    // 1. Get from Public DB
    const row = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        forms: {
          orderBy: [desc(forms.createdAt)],
          with: {
            responses: {
              columns: { id: true },
            },
          },
        },
      },
    });

    if (!row) throw new Error("User not found");

    // 2. Get from Supabase Auth
    const { createAdminClient } = await import("@/lib/supabase-admin");
    const adminClient = createAdminClient();
    const { data: { user: authUser }, error: authError } = await adminClient.auth.admin.getUserById(id);
    
    if (authError || !authUser) {
      console.error("Auth fetch error:", authError);
    }

    return {
      success: true,
      data: {
        ...row,
        formCount: row.forms.length,
        userMetadata: authUser?.user_metadata ?? {},
        appMetadata: authUser?.app_metadata ?? {},
        lastSignInAt: authUser?.last_sign_in_at,
        confirmedAt: authUser?.confirmed_at,
        forms: row.forms.map((f) => ({
          id: f.id,
          title: f.title,
          slug: f.slug,
          status: f.status,
          createdAt: f.createdAt,
          responsesCount: f.responses.length,
        })),
      } as AdminUser,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function adminUpdateUser(
  targetUserId: string,
  data: { 
    name?: string; 
    email?: string; 
    role?: UserRole;
    avatarUrl?: string | null;
    emailVerifiedAt?: Date | null;
    userMetadata?: any;
    appMetadata?: any;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId: callerId, role: callerRole } = await assertAdmin();

    const target = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    if (!target) throw new Error("User not found");

    if (data.role) {
      if (data.role === "superadmin" && callerRole !== "superadmin") {
        throw new Error("Only a superadmin can grant superadmin role");
      }
      if (targetUserId === callerId && data.role === "user") {
        throw new Error("You cannot remove your own admin role");
      }
    }

    // 1. Pre-update checks
    if (data.email && data.email !== target.email) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, data.email),
      });
      if (existing) throw new Error("Email address is already in use by another account");
    }

    // 2. Update Supabase Auth First (External call)
    // Best practice: Update external providers before local DB to ensure consistency on failure
    if (data.email || data.userMetadata !== undefined || data.appMetadata !== undefined || data.role) {
      const { createAdminClient } = await import("@/lib/supabase-admin");
      const adminClient = createAdminClient();
      
      const authUpdates: any = {
        ...(data.email && { email: data.email, email_confirm: true }),
        ...(data.userMetadata !== undefined && { user_metadata: data.userMetadata }),
        app_metadata: {
          ...(data.appMetadata !== undefined ? data.appMetadata : {}),
          ...(data.role && { role: data.role }), // Sync role to app_metadata for RLS
        }
      };

      const { error: authError } = await adminClient.auth.admin.updateUserById(
        targetUserId,
        authUpdates
      );
      if (authError) throw new Error(`Auth Provider Error: ${authError.message}`);
    }

    // 2. Update Public DB
    await db
      .update(users)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.emailVerifiedAt !== undefined && { emailVerifiedAt: data.emailVerifiedAt }),
      })
      .where(eq(users.id, targetUserId));

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error("adminUpdateUser Error:", err);
    return { success: false, error: (err as Error).message };
  }
}



export async function adminUpdateUserAvatar(
  targetUserId: string,
  formData: FormData
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No file provided");

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) throw new Error("File size must be under 5 MB");

    const target = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { avatarUrl: true },
    });

    const supabase = await createClient();
    const bucket = "goform-assets";
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() ?? "png";
    const storagePath = `avatars/${targetUserId}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, { upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    await db
      .update(users)
      .set({ avatarUrl: publicUrl })
      .where(eq(users.id, targetUserId));

    if (target?.avatarUrl && target.avatarUrl.includes(bucket)) {
      try {
        const oldPath = target.avatarUrl.split(`${bucket}/`)[1];
        if (oldPath && oldPath !== storagePath) {
          await supabase.storage.from(bucket).remove([oldPath]);
        }
      } catch (cleanupErr) {
        console.error("Non-critical: Failed to cleanup old avatar:", cleanupErr);
      }
    }


    revalidatePath("/admin/users");
    return { success: true, url: publicUrl };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function adminDeleteUser(
  targetUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { userId: callerId } = await assertAdmin();

    if (targetUserId === callerId) {
      throw new Error("You cannot delete your own account");
    }

    const target = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { id: true, avatarUrl: true },
    });
    if (!target) throw new Error("User not found");

    // 1. Storage Cleanup (Pre-emptive)
    const supabase = await createClient();
    const assetsBucket = "goform-assets";
    const profileBucket = "embersatu";

    try {
      if (target.avatarUrl) {
        const isAssetsBucket = target.avatarUrl.includes(assetsBucket);
        const isProfileBucket = target.avatarUrl.includes(profileBucket);
        const bucket = isAssetsBucket ? assetsBucket : isProfileBucket ? profileBucket : null;
        
        if (bucket) {
          const path = target.avatarUrl.split(`${bucket}/`)[1];
          if (path) await supabase.storage.from(bucket).remove([path]);
        }
      }

      const userAssets = await db.query.assets.findMany({
        where: eq(assets.userId, targetUserId),
        columns: { storagePath: true },
      });
      if (userAssets.length > 0) {
        const paths = userAssets.map((a) => a.storagePath);
        await supabase.storage.from(assetsBucket).remove(paths);
      }
    } catch (storageErr) {
      console.warn("Non-critical: Storage cleanup failed during user deletion", storageErr);
    }

    // 2. Auth Revocation (External call first)
    const { createAdminClient } = await import("@/lib/supabase-admin");
    const adminClient = createAdminClient();
    await adminClient.auth.admin.signOut(targetUserId, "global");

    // 3. Database Operations (Atomic Transaction)
    // Best practice: Use transactions for complex multi-table mutations
    await db.transaction(async (tx) => {
      // Handle Ownership Succession
      const ownedOrgs = await tx.query.organizationMembers.findMany({
        where: and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.role, "owner")
        )
      });

      for (const membership of ownedOrgs) {
        const orgId = membership.organizationId;
        const managers = await tx.query.organizationMembers.findMany({
          where: and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.role, "manager")
          )
        });

        if (managers.length > 0) {
          const randomManager = managers[Math.floor(Math.random() * managers.length)];
          await tx.update(organizationMembers)
            .set({ role: "owner" })
            .where(eq(organizationMembers.id, randomManager.id));
        } else {
          await tx.update(organizations)
            .set({ ownerDeletedAt: new Date() })
            .where(eq(organizations.id, orgId));
        }
      }

      // Delete from Public DB
      await tx.delete(users).where(eq(users.id, targetUserId));
    });

    // 4. Final Auth Delete
    const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (authError) throw new Error(`Auth Delete Error: ${authError.message}`);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error("adminDeleteUser Error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function adminUpdateUserPassword(
  targetUserId: string,
  newPassword: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const { createAdminClient } = await import("@/lib/supabase-admin");
    const adminClient = createAdminClient();

    const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (error) throw error;

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
export async function adminSignOutUser(
  targetUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const { createAdminClient } = await import("@/lib/supabase-admin");
    const adminClient = createAdminClient();

    const { error } = await adminClient.auth.admin.signOut(targetUserId, "global");

    if (error) throw error;

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
