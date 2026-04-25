"use server";

import { db } from "@/db";
import { organizations, organizationMembers, users, forms, assets } from "@/db/schema";
import { eq, count, sql, and, desc, isNotNull, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "./utils";
import { cleanupOrganizationResources } from "../organizations";

// ─── Organization Management Types ──────────────────────────────────────────

export type AdminOrganization = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  ownerDeletedAt: Date | null;
  memberCount: number;
  formCount: number;
};

export type AdminOrgAsset = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: string;
  url: string;
  storagePath: string;
  createdAt: Date;
};

export type AdminOrganizationDetail = AdminOrganization & {
  members: {
    id: string;
    role: string;
    joinedAt: Date;
    user: {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
    };
  }[];
  forms: {
    id: string;
    title: string;
    slug: string;
    createdAt: Date;
    responsesCount: number;
  }[];
  assets: AdminOrgAsset[];
  storage: {
    totalBytes: number;
    totalFiles: number;
    assetBytes: number;
    assetFiles: number;
    formBytes: number;
    formFiles: number;
    limitBytes: number;
  };
};

// ─── Organization Management Actions ────────────────────────────────────────

export async function adminGetOrganizations(): Promise<
  { success: true; data: AdminOrganization[] } | { success: false; error: string }
> {
  try {
    await assertAdmin();

    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        description: organizations.description,
        avatarUrl: organizations.avatarUrl,
        createdAt: organizations.createdAt,
        ownerDeletedAt: organizations.ownerDeletedAt,
        memberCount: sql<number>`cast(count(distinct ${organizationMembers.id}) as int)`,
        formCount: sql<number>`cast(count(distinct ${forms.id}) as int)`,
      })
      .from(organizations)
      .leftJoin(organizationMembers, eq(organizationMembers.organizationId, organizations.id))
      .leftJoin(forms, eq(forms.organizationId, organizations.id))
      .groupBy(organizations.id)
      .orderBy(desc(organizations.createdAt));

    return { success: true, data: rows as AdminOrganization[] };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function adminGetOrganization(id: string): Promise<
  { success: true; data: AdminOrganizationDetail } | { success: false; error: string }
> {
  try {
    await assertAdmin();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });

    if (!org) throw new Error("Organization not found");

    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, id),
      with: {
        user: true,
      },
      orderBy: [desc(organizationMembers.createdAt)],
    });

    const orgForms = await db.query.forms.findMany({
      where: eq(forms.organizationId, id),
      with: {
        responses: {
          columns: { id: true },
        },
      },
      orderBy: [desc(forms.createdAt)],
    });

    const orgAssets = await db.query.assets.findMany({
      where: isNotNull(assets.organizationId)
        ? eq(assets.organizationId, id)
        : undefined,
      orderBy: [desc(assets.createdAt)],
    });

    const storageRows = await db
      .select({
        isForm: sql<boolean>`${assets.storagePath} LIKE 'forms/%'`,
        totalBytes: sum(assets.size),
        totalFiles: count(assets.id),
      })
      .from(assets)
      .where(eq(assets.organizationId, id))
      .groupBy(sql`${assets.storagePath} LIKE 'forms/%'`);

    let totalBytes = 0, totalFiles = 0, assetBytes = 0, assetFiles = 0, formBytes = 0, formFiles = 0;
    for (const row of storageRows) {
      const b = Number(row.totalBytes ?? 0);
      const c = Number(row.totalFiles ?? 0);
      totalBytes += b; totalFiles += c;
      if (row.isForm) { formBytes += b; formFiles += c; }
      else { assetBytes += b; assetFiles += c; }
    }

    return {
      success: true,
      data: {
        ...org,
        memberCount: members.length,
        formCount: orgForms.length,
        members: members.map((m) => ({
          id: m.id,
          role: m.role,
          joinedAt: m.createdAt,
          user: m.user,
        })),
        forms: orgForms.map((f) => ({
          id: f.id,
          title: f.title,
          slug: f.slug,
          createdAt: f.createdAt,
          responsesCount: f.responses.length,
        })),
        assets: orgAssets.map((a) => ({
          id: a.id,
          name: a.name,
          originalName: a.originalName,
          mimeType: a.mimeType,
          size: a.size,
          type: a.type,
          url: a.url,
          storagePath: a.storagePath,
          createdAt: a.createdAt,
        })),
        storage: { totalBytes, totalFiles, assetBytes, assetFiles, formBytes, formFiles, limitBytes: 100 * 1024 * 1024 },
      } as AdminOrganizationDetail,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function adminUpdateOrganization(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    avatarUrl?: string | null;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    await db.update(organizations)
      .set(data)
      .where(eq(organizations.id, id));

    revalidatePath(`/admin/organizations/${id}/edit`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function adminDeleteOrganization(id: string): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await assertAdmin();

    // Perform thorough cleanup
    await cleanupOrganizationResources(id);

    // Cascading delete is handled by DB schema
    await db.delete(organizations).where(eq(organizations.id, id));

    revalidatePath("/admin/organizations");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function adminUpdateOrganizationMember(
  memberId: string,
  role: "owner" | "administrator" | "manager" | "editor" | "viewer"
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    // If setting a new owner, we should ideally downgrade the old owner to manager 
    // BUT since it's admin doing this, we might want to allow multiple owners or just strict swap.
    // Let's assume strict swap if it's the standard behavior.
    
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, memberId),
    });

    if (!member) throw new Error("Member not found");

    if (role === "owner") {
      // Downgrade other owners to manager
      await db.update(organizationMembers)
        .set({ role: "manager" })
        .where(and(
          eq(organizationMembers.organizationId, member.organizationId),
          eq(organizationMembers.role, "owner")
        ));
    }

    await db.update(organizationMembers)
      .set({ role })
      .where(eq(organizationMembers.id, memberId));

    revalidatePath(`/admin/organizations/${member.organizationId}/edit`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function adminRemoveOrganizationMember(memberId: string): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await assertAdmin();

    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, memberId),
    });

    if (!member) throw new Error("Member not found");

    // Prevent removing the last owner
    if (member.role === "owner") {
      const owners = await db.query.organizationMembers.findMany({
        where: and(
          eq(organizationMembers.organizationId, member.organizationId),
          eq(organizationMembers.role, "owner")
        ),
      });
      if (owners.length <= 1) {
        throw new Error("Cannot remove the only owner of the organization");
      }
    }

    await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

    revalidatePath(`/admin/organizations/${member.organizationId}/edit`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
