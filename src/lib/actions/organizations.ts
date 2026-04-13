"use server";

import { db } from "@/db";
import { organizations, organizationMembers, organizationInvites, users } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import crypto from "crypto";
import { resend } from "@/lib/resend";

import { WORKSPACE_COOKIE, PERSONAL_WORKSPACE_ID } from "../constants";
import { getBaseUrl } from "../utils/url";

// Helper to reliably get auth user
async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ─── Workspace Cookie Management ──────────────────────────────────────────────

export const getActiveWorkspace = cache(async (): Promise<string> => {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  return workspaceId || PERSONAL_WORKSPACE_ID;
});

export async function setActiveWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  if (workspaceId === PERSONAL_WORKSPACE_ID) {
    cookieStore.set(WORKSPACE_COOKIE, PERSONAL_WORKSPACE_ID, { path: "/" });
    return;
  }
  
  const user = await getAuthUser();
  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, workspaceId),
      eq(organizationMembers.userId, user.id)
    )
  });

  if (member) {
    cookieStore.set(WORKSPACE_COOKIE, workspaceId, { path: "/" });
  } else {
    cookieStore.set(WORKSPACE_COOKIE, PERSONAL_WORKSPACE_ID, { path: "/" });
  }
}

// ─── RBAC Helpers ─────────────────────────────────────────────────────────────

export const verifyWorkspaceAccess = cache(async (
  orgId: string | null, 
  requiredRole: "owner" | "manager" | "administrator" | "editor" | "viewer" = "viewer"
): Promise<{ success: boolean; error?: string; role?: string }> => {
  try {
    const user = await getAuthUser();
    
    if (!orgId) {
      return { success: true, role: "owner" };
    }

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, user.id)
      )
    });

    if (!member) {
      return { success: false, error: "You are not a member of this workspace" };
    }

    const rolesRank = { owner: 5, manager: 4, administrator: 3, editor: 2, viewer: 1 };

    if (rolesRank[member.role] < rolesRank[requiredRole]) {
      return { success: false, error: "Insufficient permissions" };
    }

    return { success: true, role: member.role };
  } catch(err) {
    return { success: false, error: "Authentication required" };
  }
});

// ─── Organization Readers ───────────────────────────────────────────────────

export async function getUserOrganizations() {
  try {
    const user = await getAuthUser();
    const memberships = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.userId, user.id),
      with: { organization: true }
    });

    return { 
      success: true, 
      data: memberships.map(m => ({ ...m.organization, role: m.role })) 
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getOrganization(id: string) {
  try {
    const access = await verifyWorkspaceAccess(id, "viewer");
    if (!access.success) throw new Error(access.error);

    const user = await getAuthUser();
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, id)
    });

    return { success: true, data: { ...org, currentUserRole: access.role, currentUserId: user.id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getOrganizationMembers(id: string) {
  try {
    const access = await verifyWorkspaceAccess(id, "viewer");
    if (!access.success) throw new Error(access.error);

    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, id),
      with: { user: true }
    });
    
    const invites = await db.query.organizationInvites.findMany({
      where: eq(organizationInvites.organizationId, id)
    });

    return { success: true, data: { members, invites } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Organization Writers ───────────────────────────────────────────────────

export async function createOrganization(input: { name: string, description?: string }) {
  try {
    const user = await getAuthUser();
    
    const { users: usersTable } = await import("@/db/schema");
    await db.insert(usersTable).values({ id: user.id, email: user.email! }).onConflictDoNothing();

    const [org] = await db.insert(organizations).values({
      name: input.name,
      description: input.description,
    }).returning({ id: organizations.id });

    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: "owner"
    });

    await setActiveWorkspace(org.id);
    revalidatePath("/organizations");
    return { success: true, data: org };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateOrganization(id: string, input: { name?: string, description?: string, avatarUrl?: string }) {
  try {
    const access = await verifyWorkspaceAccess(id, "administrator");
    if (!access.success) throw new Error(access.error);

    await db.update(organizations).set(input).where(eq(organizations.id, id));
    revalidatePath(`/organizations/${id}`);
    revalidatePath("/organizations");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function uploadOrganizationAvatarAction(orgId: string, formData: FormData) {
  try {
    const access = await verifyWorkspaceAccess(orgId, "administrator");
    if (!access.success) throw new Error(access.error);

    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");
    
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("File size must be less than 2MB.");
    }

    const supabase = await createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${orgId}-${Math.random()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("embersatu")
      .upload(`org_avatars/${fileName}`, file, { upsert: true });

    if (error) throw new Error(error.message);

    const { data: publicUrlData } = supabase.storage
      .from("embersatu")
      .getPublicUrl(`org_avatars/${fileName}`);

    await db.update(organizations)
      .set({ avatarUrl: publicUrlData.publicUrl })
      .where(eq(organizations.id, orgId));

    revalidatePath(`/organizations/${orgId}`);
    revalidatePath("/organizations");
    return { success: true, avatarUrl: publicUrlData.publicUrl };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function removeOrganizationAvatarAction(orgId: string) {
  try {
    const access = await verifyWorkspaceAccess(orgId, "administrator");
    if (!access.success) throw new Error(access.error);

    await db.update(organizations)
      .set({ avatarUrl: null })
      .where(eq(organizations.id, orgId));

    revalidatePath(`/organizations/${orgId}`);
    revalidatePath("/organizations");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}


export async function deleteOrganization(id: string) {
  try {
    const access = await verifyWorkspaceAccess(id, "owner");
    if (!access.success) throw new Error("Only the owner can delete the organization");

    await db.delete(organizations).where(eq(organizations.id, id));
    
    // reset workspace if it was the active one
    const active = await getActiveWorkspace();
    if (active === id) {
      await setActiveWorkspace(PERSONAL_WORKSPACE_ID);
    }
    
    revalidatePath("/organizations");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Member Management  ───────────────────────────────────────────────────

export async function inviteMember(orgId: string, email: string, role: "manager"|"administrator"|"editor"|"viewer") {
  try {
    const requiredAccess = role === "manager" ? "manager" : "administrator";
    const access = await verifyWorkspaceAccess(orgId, requiredAccess);
    if (!access.success) throw new Error(access.error);

    // 1. Check if user is already a member
    const existingMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, orgId),
        sql`${organizationMembers.userId} IN (SELECT id FROM ${users} WHERE email = ${email})`
      )
    });

    if (existingMember) {
      throw new Error("This email is already a member of the organization");
    }

    // 2. Resolve organization name for the email
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId)
    });

    // Create a unguessable token
    const token = crypto.randomBytes(32).toString("hex");
    // Expiration in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invite] = await db.insert(organizationInvites).values({
      organizationId: orgId,
      email,
      role,
      token,
      expiresAt,
    }).returning();

    // 3. Send email via Resend
    const baseUrl = await getBaseUrl();
    const inviteLink = `${baseUrl}/api/accept-invite?token=${token}`;

    const { error: emailError } = await resend.emails.send({
      from: 'GoForm <no-reply@formto.link>',
      to: [email],
      subject: `Invitation to join ${org?.name || 'an organization'} on GoForm`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #111827;">You've been invited!</h2>
          <p style="color: #4b5563; line-height: 1.5;">
            You have been invited to join <strong>${org?.name || 'the organization'}</strong> as a <strong>${role}</strong> on GoForm.
          </p>
          <div style="margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <a href="${inviteLink}" style="color: #4f46e5;">${inviteLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            This invitation was intended for ${email}. If you were not expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      // We don't throw here to ensure the invite is still created in DB, 
      // but we return the link for manual sharing as fallback if needed.
    }

    revalidatePath(`/organizations/${orgId}`);
    
    return { success: true, data: invite };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function cancelInviteAction(orgId: string, inviteId: string) {
  try {
    const access = await verifyWorkspaceAccess(orgId, "administrator");
    if (!access.success) throw new Error(access.error);

    await db.delete(organizationInvites)
      .where(and(
        eq(organizationInvites.id, inviteId),
        eq(organizationInvites.organizationId, orgId)
      ));

    revalidatePath(`/organizations/${orgId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function acceptInvite(token: string) {
  try {
    const user = await getAuthUser();
    
    const invite = await db.query.organizationInvites.findFirst({
      where: eq(organizationInvites.token, token)
    });

    if (!invite) throw new Error("Invalid or expired invite");
    if (invite.expiresAt < new Date()) throw new Error("Invite expired");

    // Ensure email matches
    if (user.email !== invite.email) {
      throw new Error(`This invitation was sent to ${invite.email}, but you are logged in as ${user.email}. Please log in with the correct account.`);
    }

    // add to members
    const { users: usersTable } = await import("@/db/schema");
    await db.insert(usersTable).values({ id: user.id, email: user.email! }).onConflictDoNothing();

    await db.insert(organizationMembers).values({
      organizationId: invite.organizationId,
      userId: user.id,
      role: invite.role,
    }).onConflictDoNothing();

    await db.delete(organizationInvites).where(eq(organizationInvites.id, invite.id));
    
    revalidatePath("/organizations");
    return { success: true, data: { organizationId: invite.organizationId } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateMemberRole(orgId: string, memberUserId: string, newRole: "manager"|"administrator"|"editor"|"viewer") {
  try {
    const requiredAccess = newRole === "manager" ? "manager" : "administrator";
    const access = await verifyWorkspaceAccess(orgId, requiredAccess);
    if (!access.success) throw new Error(access.error);

    // Prevent changing owner role or acting on owners if not owner
    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, memberUserId))
    });

    if (!targetMember) throw new Error("Member not found");
    if (targetMember.role === "owner") throw new Error("Cannot change owner's role");

    await db.update(organizationMembers)
      .set({ role: newRole })
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, memberUserId)));

    revalidatePath(`/organizations/${orgId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function removeMember(orgId: string, memberUserId: string) {
  try {
    const user = await getAuthUser();
    
    // Either self-leaving, or an administrator removing someone else
    if (user.id !== memberUserId) {
      const access = await verifyWorkspaceAccess(orgId, "administrator");
      if (!access.success) throw new Error(access.error);
    }

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, memberUserId))
    });

    if (!targetMember) throw new Error("Member not found");
    if (targetMember.role === "owner") throw new Error("Owner cannot leave or be removed without transferring ownership first");

    await db.delete(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, memberUserId)));

    if (user.id === memberUserId) {
       // if we left the current active workspace, switch
       const active = await getActiveWorkspace();
       if (active === orgId) await setActiveWorkspace(PERSONAL_WORKSPACE_ID);
    }

    revalidatePath(`/organizations/${orgId}`);
    revalidatePath("/organizations");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function transferOwnershipAction(orgId: string, targetEmail: string) {
  try {
    const user = await getAuthUser();
    
    // 1. Verify current user is owner
    const currentMember = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, user.id))
    });
    
    if (!currentMember || currentMember.role !== "owner") {
      throw new Error("Only the owner can transfer ownership");
    }

    // 2. Resolve target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.email, targetEmail)
    });

    if (!targetUser) throw new Error("User with this email does not exist");

    // 3. Verify target is a member
    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, targetUser.id))
    });

    if (!targetMember) throw new Error("Target user is not a member of this organization");

    // 4. Atomic swap
    await db.transaction(async (tx) => {
      // Current owner becomes manager
      await tx.update(organizationMembers)
        .set({ role: "manager" })
        .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, user.id)));

      // Target becomes owner
      await tx.update(organizationMembers)
        .set({ role: "owner" })
        .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, targetUser.id)));
    });

    revalidatePath(`/organizations/${orgId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
