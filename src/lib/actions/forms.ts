"use server";

import { db } from "@/db";
import { forms, formFields, formResponses, type NewForm, type NewFormField } from "@/db/schema";
import { createClient } from "@/lib/server";
import { liveblocks } from "@/lib/liveblocks";
import { eq, desc, ilike, and, count, sql, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult, BuilderField, BuilderForm, BuilderSection, LogicRule } from "@/lib/form-types";
import { z } from "zod";
import { getActiveWorkspace, verifyWorkspaceAccess } from "./organizations";
import { PERSONAL_WORKSPACE_ID } from "../constants";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80) +
    "-" +
    Math.random().toString(36).substring(2, 7)
  );
}

// ─── List Forms ───────────────────────────────────────────────────────────────

export async function getForms({ search }: { search?: string } = {}): Promise<
  ActionResult<{
    id: string;
    title: string;
    status: "draft" | "active" | "closed";
    responseCount: number;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    accentColor: string;
    collaborationEnabled: boolean;
  }[]>
> {
  try {
    const user = await getAuthUser();
    const workspaceId = await getActiveWorkspace();
    const isPersonal = workspaceId === PERSONAL_WORKSPACE_ID;

    // Verify access to workspace
    const access = await verifyWorkspaceAccess(isPersonal ? null : workspaceId, "viewer");
    if (!access.success) throw new Error(access.error);
    
    let baseWhere = isPersonal 
      ? and(eq(forms.userId, user.id), isNull(forms.organizationId))
      : eq(forms.organizationId, workspaceId);

    if (search) {
      baseWhere = and(baseWhere, ilike(forms.title, `%${search}%`));
    }

    const rows = await db
      .select({
        id: forms.id,
        title: forms.title,
        status: forms.status,
        createdAt: forms.createdAt,
        updatedAt: forms.updatedAt,
        slug: forms.slug,
        accentColor: forms.accentColor,
        collaborationEnabled: forms.collaborationEnabled,
        responseCount: count(formResponses.id).mapWith(Number),
      })
      .from(forms)
      .leftJoin(formResponses, eq(formResponses.formId, forms.id))
      .where(baseWhere)
      .groupBy(forms.id)
      .orderBy(desc(forms.updatedAt));

    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Get Single Form ──────────────────────────────────────────────────────────

export async function getForm(id: string): Promise<ActionResult<{
  form: typeof forms.$inferSelect;
  fields: typeof formFields.$inferSelect[];
  sections: BuilderSection[];
  logic: LogicRule[];
  currentUserRole: "owner" | "manager" | "administrator" | "editor" | "viewer";
  currentUserId: string;
}>> {
  try {
    const user = await getAuthUser();
    const form = await db.query.forms.findFirst({
      where: eq(forms.id, id),
      with: {
        fields: {
          orderBy: [formFields.orderIndex],
        },
      },
    });

    if (!form) return { success: false, error: "Form not found" };

    let currentUserRole: "owner" | "manager" | "administrator" | "editor" | "viewer" = "viewer";

    // Check if personal owner, or member of the organization
    if (form.organizationId) {
      const access = await verifyWorkspaceAccess(form.organizationId, "viewer");
      if (!access.success) throw new Error(access.error);
      currentUserRole = (access.role as typeof currentUserRole) ?? "viewer";
    } else if (form.userId !== user.id) {
       throw new Error("Unauthorized");
    } else {
      currentUserRole = "owner";
    }

    const { fields, ...formData } = form;
    const sections: BuilderSection[] = Array.isArray(form.sections) && form.sections.length > 0
      ? form.sections as BuilderSection[]
      : [];
    const logic: LogicRule[] = Array.isArray(form.logic) ? form.logic as LogicRule[] : [];
    return { success: true, data: { form: formData, fields, sections, logic, currentUserRole, currentUserId: user.id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Get Form by Slug (Public) ────────────────────────────────────────────────

export async function getFormBySlug(slug: string): Promise<ActionResult<{
  form: typeof forms.$inferSelect;
  fields: typeof formFields.$inferSelect[];
  sections: BuilderSection[];
  logic: LogicRule[];
}>> {
  try {
    const form = await db.query.forms.findFirst({
      where: eq(forms.slug, slug),
      with: {
        fields: {
          orderBy: [formFields.orderIndex],
        },
      },
    });

    if (!form) return { success: false, error: "Form not found" };

    const { fields, ...formData } = form;
    const sections: BuilderSection[] = Array.isArray(form.sections) && form.sections.length > 0
      ? form.sections as BuilderSection[]
      : [];
    const logic: LogicRule[] = Array.isArray(form.logic) ? form.logic as LogicRule[] : [];
    return { success: true, data: { form: formData, fields, sections, logic } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Save Form Logic ──────────────────────────────────────────────────────────

export async function saveFormLogic(
  formId: string,
  logic: LogicRule[]
): Promise<ActionResult> {
  try {
    await enforceFormAccess(formId, "editor");

    await db
      .update(forms)
      .set({ logic, updatedAt: new Date() })
      .where(eq(forms.id, formId));

    revalidatePath(`/forms/${formId}/logic`);
    revalidatePath(`/forms/${formId}/edit`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Create Form ──────────────────────────────────────────────────────────────

const createFormSchema = z.object({
  title: z.string().min(1).max(200),
});

export async function createForm(
  input: { title: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getAuthUser();
    const { title } = createFormSchema.parse(input);
    const workspaceId = await getActiveWorkspace();
    const isPersonal = workspaceId === PERSONAL_WORKSPACE_ID;

    if (!isPersonal) {
      const access = await verifyWorkspaceAccess(workspaceId, "editor");
      if (!access.success) throw new Error(access.error);
    }

    // Ensure user exists in users table
    const { users: usersTable } = await import("@/db/schema");
    await db
      .insert(usersTable)
      .values({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      })
      .onConflictDoNothing();

    const slug = generateSlug(title);
    const [form] = await db
      .insert(forms)
      .values({
        userId: isPersonal ? user.id : null,
        organizationId: isPersonal ? null : workspaceId,
        title,
        slug,
        updatedAt: new Date(),
      } as NewForm)
      .returning({ id: forms.id });

    revalidatePath("/forms");
    return { success: true, data: { id: form.id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Check Form Access Helper ─────────────────────────────────────────────────
export async function enforceFormAccess(formId: string, requiredRole: "owner" | "administrator" | "editor" | "viewer") {
  const user = await getAuthUser();
  const form = await db.query.forms.findFirst({ where: eq(forms.id, formId) });
  if (!form) throw new Error("Form not found");

  if (form.organizationId) {
    const access = await verifyWorkspaceAccess(form.organizationId, requiredRole);
    if (!access.success) throw new Error(access.error);
  } else if (form.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  return form;
}

// ─── Bulk Move Forms ──────────────────────────────────────────────────────────

export async function moveForms(formIds: string[], targetWorkspaceId: string): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    const targetIsPersonal = targetWorkspaceId === PERSONAL_WORKSPACE_ID;
    
    // Check access to target workspace
    if (!targetIsPersonal) {
      const targetAccess = await verifyWorkspaceAccess(targetWorkspaceId, "administrator");
      if (!targetAccess.success) throw new Error("Need administrator access to target workspace to move forms there");
    }

    for (const id of formIds) {
       // Must have administrator access to source workspace to move form
       await enforceFormAccess(id, "administrator");
       
       await db.update(forms)
        .set({ 
          organizationId: targetIsPersonal ? null : targetWorkspaceId,
          // When moving to personal workspace, the current user becomes the owner.
          // When moving to an organization, we clear the creator (userId) for true org ownership.
          userId: targetIsPersonal ? user.id : null,
          updatedAt: new Date(),
        })
        .where(eq(forms.id, id));
    }
    
    revalidatePath("/forms");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Update Form Metadata ─────────────────────────────────────────────────────

export async function updateForm(
  id: string,
  data: Partial<BuilderForm>,
  shouldRevalidate = true
): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    await enforceFormAccess(id, "editor");
    
    // Strip logic from metadata — logic is saved separately via saveFormLogic
    const { logic: _logic, ...safeData } = data;

    // Convert date strings to Date objects for Drizzle timestamp columns
    const updateData: Record<string, any> = { 
      ...safeData, 
      updatedAt: new Date() 
    };
    
    if (safeData.startsAt !== undefined) {
      updateData.startsAt = safeData.startsAt ? new Date(safeData.startsAt) : null;
    }
    if (safeData.endsAt !== undefined) {
      updateData.endsAt = safeData.endsAt ? new Date(safeData.endsAt) : null;
    }
    
    if (data.collaborationEnabled !== undefined) {
      updateData.lastToggledBy = user.id;
    }

    await db
      .update(forms)
      .set(updateData)
      .where(eq(forms.id, id));

    if (shouldRevalidate) {
      revalidatePath(`/forms/${id}`);
    }

    // sync changes to liveblocks if they exist
    try {
      await liveblocks.mutateStorage(id, ({ root }) => {
        const meta = root.get("formMetadata");
        if (meta) {
          for (const [key, value] of Object.entries(data)) {
            // Only set fields that exist in BuilderForm to avoid storage pollution
            meta.set(key, value);
          }
        }
      });
    } catch (err) {
      // Room might not exist yet, or other liveblocks error. 
      // We don't want to fail the main action if sync fails.
      console.error("Liveblocks sync failed:", err);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Save Form Fields (Full Replace) ─────────────────────────────────────────

export async function saveFormFields(
  formId: string,
  fields: BuilderField[],
  shouldRevalidate = true
): Promise<ActionResult> {
  try {
    await db.transaction(async (tx) => {
      // Delete all existing fields
      await tx.delete(formFields).where(eq(formFields.formId, formId));

      if (fields.length > 0) {
        const toInsert: NewFormField[] = fields.map((f, i) => ({
          id: f.id, // Always use the ID from frontend (now guaranteed to be a valid UUID)
          formId,
          type: f.type,
          label: f.label,
          description: f.description || null,
          placeholder: f.placeholder || null,
          required: f.required,
          orderIndex: i,
          options: f.options || [],
          validation: f.validation || {},
          properties: f.properties || {},
        }));

        await tx.insert(formFields).values(toInsert);
      }

      await tx
        .update(forms)
        .set({ updatedAt: new Date() })
        .where(eq(forms.id, formId));
    });

    if (shouldRevalidate) {
      revalidatePath(`/forms/${formId}/edit`);
    }
    return { success: true };
  } catch (err) {
    console.error("Failed to save form fields:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * ── SYNC FORM STATE (Performance Optimized) ──
 * Combines updateForm and saveFormFields into a single action to reduce auth overhead.
 * Used primarily for auto-save loops in the collaborative builder.
 */
export async function syncFormState(
  id: string,
  fields: BuilderField[],
  metadata: Partial<BuilderForm>,
  shouldRevalidate = false,
  sections: BuilderSection[] = []
): Promise<ActionResult> {
  try {
    await enforceFormAccess(id, "editor");
    const user = await getAuthUser();

    await db.transaction(async (tx) => {
      // 1. Update Metadata + sections
      // Strip logic from metadata — logic is saved separately via saveFormLogic
      const { logic: _logic, ...safeMetadata } = metadata;
      const updateData: Record<string, any> = { 
        ...safeMetadata, 
        sections,
        updatedAt: new Date() 
      };
      if (metadata.collaborationEnabled !== undefined) {
        updateData.lastToggledBy = user.id;
      }
      await tx.update(forms).set(updateData).where(eq(forms.id, id));

      // 2. Update Fields (Delete & Insert) — include sectionId
      await tx.delete(formFields).where(eq(formFields.formId, id));
      if (fields.length > 0) {
        const toInsert: NewFormField[] = fields.map((f, i) => {
          const row: NewFormField = {
            id: f.id,
            formId: id,
            type: f.type,
            label: f.label,
            description: f.description || null,
            placeholder: f.placeholder || null,
            required: f.required,
            orderIndex: i,
            options: f.options || [],
            validation: f.validation || {},
            properties: f.properties || {},
            sectionId: (() => {
              const sid = (f as any).sectionId;
              if (!sid || typeof sid !== "string") return null;
              // Reject non-UUID strings like "default" that Liveblocks may have stored
              const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              return uuidRe.test(sid) ? sid : null;
            })(),
          };
          return row;
        });
        await tx.insert(formFields).values(toInsert);
      }
    });

    if (shouldRevalidate) {
      revalidatePath(`/forms/${id}/edit`);
    }

    return { success: true };
  } catch (err) {
    console.error("syncFormState failed:", err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── Publish / Status Change ──────────────────────────────────────────────────

export async function setFormStatus(
  id: string,
  status: "draft" | "active" | "closed"
): Promise<ActionResult> {
  try {
    await enforceFormAccess(id, "editor");
    await db
      .update(forms)
      .set({ status, updatedAt: new Date() })
      .where(eq(forms.id, id));

    revalidatePath(`/forms/${id}`);
    revalidatePath("/forms");

    // sync changes to liveblocks
    try {
      await liveblocks.mutateStorage(id, ({ root }) => {
        const meta = root.get("formMetadata");
        if (meta) {
          meta.set("status", status);
        }
      });
    } catch (err) {
      console.error("Liveblocks status sync failed:", err);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Delete Form ──────────────────────────────────────────────────────────────

export async function deleteForm(id: string): Promise<ActionResult> {
  try {
    await enforceFormAccess(id, "editor");
    await db
      .delete(forms)
      .where(eq(forms.id, id));

    revalidatePath("/forms");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteForms(ids: string[]): Promise<ActionResult> {
  try {
    // Verify access for all forms first
    for (const id of ids) {
      await enforceFormAccess(id, "editor");
    }

    await db
      .delete(forms)
      .where(inArray(forms.id, ids));

    revalidatePath("/forms");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Duplicate Form ───────────────────────────────────────────────────────────

export async function duplicateForm(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getAuthUser();
    const result = await getForm(id);
    if (!result.success || !result.data) {
      return { success: false, error: "Form not found" };
    }

    const { form, fields, sections, logic } = result.data;
    
    // Ensure we can duplicate into the current active workspace
    const workspaceId = await getActiveWorkspace();
    const isPersonal = workspaceId === PERSONAL_WORKSPACE_ID;
    if (!isPersonal) {
      const access = await verifyWorkspaceAccess(workspaceId, "editor");
      if (!access.success) throw new Error(access.error);
    }
    
    const newSlug = generateSlug(form.title);

    const [newForm] = await db
      .insert(forms)
      .values({
        userId: isPersonal ? user.id : null,
        organizationId: isPersonal ? null : workspaceId,
        title: `${form.title} (Copy)`,
        description: form.description,
        slug: newSlug,
        status: "draft",
        accentColor: form.accentColor,
        acceptResponses: form.acceptResponses,
        requireAuth: form.requireAuth,
        showProgress: form.showProgress,
        successMessage: form.successMessage,
        autoSave: form.autoSave,
        sections: sections.length > 0 ? sections : null,
        logic: (logic ?? []) as any,
        updatedAt: new Date(),
      } as NewForm)
      .returning({ id: forms.id });

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (fields.length > 0) {
      await db.insert(formFields).values(
        fields.map((f, i) => ({
          formId: newForm.id,
          type: f.type,
          label: f.label,
          description: f.description,
          placeholder: f.placeholder,
          required: f.required,
          orderIndex: i,
          options: f.options,
          validation: f.validation,
          properties: f.properties,
          sectionId: f.sectionId && uuidRe.test(f.sectionId) ? f.sectionId : null,
        })) as NewFormField[]
      );
    }

    revalidatePath("/forms");
    return { success: true, data: { id: newForm.id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<ActionResult<{
  totalForms: number;
  totalResponses: number;
  activeForms: number;
}>> {
  try {
    const user = await getAuthUser();
    const workspaceId = await getActiveWorkspace();
    const isPersonal = workspaceId === PERSONAL_WORKSPACE_ID;

    // Verify access
    const access = await verifyWorkspaceAccess(isPersonal ? null : workspaceId, "viewer");
    if (!access.success) throw new Error(access.error);

    const baseWhere = isPersonal 
      ? and(eq(forms.userId, user.id), isNull(forms.organizationId))
      : eq(forms.organizationId, workspaceId);

    const [stats] = await db
      .select({
        totalForms: count(forms.id),
        activeForms: sql<number>`COALESCE(SUM(CASE WHEN ${forms.status} = 'active' THEN 1 ELSE 0 END), 0)`.mapWith(Number),
        totalResponses: sql<number>`(
          SELECT COUNT(*) FROM form_responses fr
          INNER JOIN forms f2 ON fr.form_id = f2.id
          WHERE f2.organization_id = ${isPersonal ? null : workspaceId}
          ${isPersonal ? sql`AND f2.organization_id IS NULL AND f2.user_id = ${user.id}` : sql``}
        )`.mapWith(Number),
      })
      .from(forms)
      .where(baseWhere);

    return { success: true, data: stats };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
