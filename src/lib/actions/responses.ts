"use server";

import { db } from "@/db";
import { forms, formFields, formResponses, assets } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq, desc, and, count, sql, gte, isNull, isNotNull, sum } from "drizzle-orm";
import { enforceFormAccess } from "./forms";
import type { ActionResult, FormAnswer, FormAnalytics, ResponseRow, FieldType } from "@/lib/form-types";

type FormWithFields = typeof forms.$inferSelect & {
  fields: (typeof formFields.$inferSelect)[];
};

// ─── Submit Form Response ─────────────────────────────────────────────────────

export async function submitFormResponse(
  formId: string,
  answers: Record<string, FormAnswer>,
  metadata?: { 
    timeTaken?: number;
    uploads?: { name: string; originalName: string; size: number; mimeType: string; path: string }[];
  }
): Promise<ActionResult<{ responseId: string }>> {
  try {
    // Load form to check if accepting responses
    const form = await db.query.forms.findFirst({
      where: eq(forms.id, formId),
    });

    if (!form) return { success: false, error: "Form not found" };
    if (form.status === "draft") {
      return { success: false, error: "This form is not yet published" };
    }
    if (form.status === "closed") {
      return { success: false, error: "This form is closed" };
    }
    if (!form.acceptResponses) {
      return { success: false, error: "This form is no longer accepting responses" };
    }

    // Check auth if required
    let respondentId: string | undefined;
    let respondentEmail: string | undefined;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (form.requireAuth) {
      if (!user) return { success: false, error: "Authentication required" };
      respondentId = user.id;
      respondentEmail = user.email ?? undefined;
    }

    // Check one response per user
    if (form.oneResponsePerUser && user) {
      const existing = await db.query.formResponses.findFirst({
        where: and(
          eq(formResponses.formId, formId),
          eq(formResponses.respondentId, user.id)
        ),
      });
      if (existing) return { success: false, error: "You have already submitted a response to this form" };
    }

    const [response] = await db
      .insert(formResponses)
      .values({
        formId,
        respondentId: respondentId ?? null,
        respondentEmail: respondentEmail ?? null,
        answers,
        metadata: metadata ?? null,
      })
      .returning({ id: formResponses.id });

    // Handle uploaded files by inserting them into the assets table
    if (metadata?.uploads && metadata.uploads.length > 0) {
      const isPersonal = !form.organizationId;
      
      const assetInserts = metadata.uploads.map((upload) => {
        let assetType: "image" | "video" | "document" | "audio" | "other" = "other";
        if (upload.mimeType.startsWith("image/")) assetType = "image";
        else if (upload.mimeType.startsWith("video/")) assetType = "video";
        else if (upload.mimeType.startsWith("audio/")) assetType = "audio";
        else if (
          upload.mimeType === "application/pdf" ||
          upload.mimeType.includes("document") ||
          upload.mimeType.includes("spreadsheet") ||
          upload.mimeType.includes("presentation") ||
          upload.mimeType.includes("text/")
        ) {
          assetType = "document";
        }

        return {
          userId: isPersonal ? form.userId : null,
          organizationId: form.organizationId ?? null,
          name: upload.name,
          originalName: upload.originalName,
          mimeType: upload.mimeType,
          size: upload.size,
          type: assetType,
          storagePath: upload.path,
          url: "", // private bucket
          uploadedBy: form.userId!, // attributing the upload to the form owner
        };
      });

      await db.insert(assets).values(assetInserts);
    }

    return { success: true, data: { responseId: response.id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Get Responses (Paginated) ────────────────────────────────────────────────

export async function getFormResponses(
  formId: string,
  page = 0,
  pageSize = 20
): Promise<ActionResult<{ responses: ResponseRow[]; total: number }>> {
  try {
    // Verify access via unified helper (viewer role required for results)
    const form = await enforceFormAccess(formId, "viewer");
    if (!form) return { success: false, error: "Form not found" };

    const [totalRow] = await db
      .select({ count: count() })
      .from(formResponses)
      .where(eq(formResponses.formId, formId));

    const rows = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(desc(formResponses.submittedAt))
      .limit(pageSize)
      .offset(page * pageSize);

    const responses: ResponseRow[] = rows.map((r) => ({
      id: r.id,
      formId: r.formId,
      respondentEmail: r.respondentEmail,
      answers: r.answers as Record<string, FormAnswer>,
      metadata: r.metadata as ResponseRow["metadata"],
      submittedAt: r.submittedAt,
    }));

    return { success: true, data: { responses, total: totalRow.count } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Delete Response ──────────────────────────────────────────────────────────

export async function deleteResponse(
  responseId: string,
  formId: string
): Promise<ActionResult> {
  try {
    // Verify access (editor role required to delete responses)
    const form = await enforceFormAccess(formId, "editor");
    if (!form) return { success: false, error: "Form not found" };
    const response = await db.query.formResponses.findFirst({
      where: and(eq(formResponses.id, responseId), eq(formResponses.formId, formId)),
    });

    if (!response) return { success: false, error: "Response not found" };

    // Extract all file paths from the answers
    const filePaths: string[] = [];
    if (response.answers && typeof response.answers === "object") {
      Object.values(response.answers).forEach((val) => {
        if (Array.isArray(val)) {
          val.forEach((item) => {
            if (typeof item === "string" && item.startsWith(`forms/${formId}/responses/`)) {
              filePaths.push(item);
            }
          });
        }
      });
    }

    if (filePaths.length > 0) {
      const supabase = await createClient();
      // Remove from storage bucket
      const { error: storageError } = await supabase.storage
        .from("form-uploads")
        .remove(filePaths);

      if (storageError) {
        console.error("Storage delete error:", storageError.message);
      }

      // Remove from assets table
      const { inArray } = await import("drizzle-orm");
      await db.delete(assets).where(inArray(assets.storagePath, filePaths));
    }

    await db
      .delete(formResponses)
      .where(and(eq(formResponses.id, responseId), eq(formResponses.formId, formId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteResponses(
  responseIds: string[],
  formId: string
): Promise<ActionResult> {
  try {
    const { inArray, and, eq } = await import("drizzle-orm");
    // Verify access (editor role required to delete responses)
    const form = await enforceFormAccess(formId, "editor");
    if (!form) return { success: false, error: "Form not found" };

    // Fetch all responses to extract file paths from the answers
    const responses = await db.query.formResponses.findMany({
      where: and(inArray(formResponses.id, responseIds), eq(formResponses.formId, formId)),
    });

    if (responses.length === 0) return { success: false, error: "No responses found" };

    // Extract all file paths from the answers
    const filePaths: string[] = [];
    responses.forEach((response) => {
      if (response.answers && typeof response.answers === "object") {
        Object.values(response.answers).forEach((val) => {
          if (Array.isArray(val)) {
            val.forEach((item) => {
              if (typeof item === "string" && item.startsWith(`forms/${formId}/responses/`)) {
                filePaths.push(item);
              }
            });
          }
        });
      }
    });

    if (filePaths.length > 0) {
      const supabase = await createClient();
      // Remove from storage bucket
      const { error: storageError } = await supabase.storage
        .from("form-uploads")
        .remove(filePaths);

      if (storageError) {
        console.error("Storage delete error:", storageError.message);
      }

      // Remove from assets table
      await db.delete(assets).where(inArray(assets.storagePath, filePaths));
    }

    await db
      .delete(formResponses)
      .where(and(inArray(formResponses.id, responseIds), eq(formResponses.formId, formId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Get Analytics ────────────────────────────────────────────────────────────

export async function getFormAnalytics(formId: string, timezone = "UTC"): Promise<ActionResult<FormAnalytics>> {

  try {
    // Verify access (viewer role required for analytics)
    const form = await enforceFormAccess(formId, "viewer") as FormWithFields;
    if (!form) return { success: false, error: "Form not found" };

    // Fetch fields separately as enforceFormAccess only returns base form data
    form.fields = await db.query.formFields.findMany({
      where: eq(formFields.formId, formId),
      orderBy: [formFields.orderIndex],
    });

    const allResponses = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(formResponses.submittedAt);

    const totalResponses = allResponses.length;

    // Avg time taken
    const timeTakens = allResponses
      .map((r) => (r.metadata as { timeTaken?: number } | null)?.timeTaken)
      .filter((t): t is number => typeof t === "number");
    const avgTimeTaken = timeTakens.length
      ? Math.round(timeTakens.reduce((a, b) => a + b, 0) / timeTakens.length)
      : 0;

    // Responses over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let responsesOverTime: { date: string; count: number }[] = [];
    try {
      responsesOverTime = await db
        .select({
          date: sql<string>`DATE(submitted_at AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::text`,
          count: count(),
        })
        .from(formResponses)
        .where(
          and(
            eq(formResponses.formId, formId),
            gte(formResponses.submittedAt, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(submitted_at AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})`)
        .orderBy(sql`DATE(submitted_at AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})`);
    } catch (err) {
      console.error("Timezone-aware analytics failed, falling back to UTC:", err);
      responsesOverTime = await db
        .select({
          date: sql<string>`DATE(submitted_at)::text`,
          count: count(),
        })
        .from(formResponses)
        .where(
          and(
            eq(formResponses.formId, formId),
            gte(formResponses.submittedAt, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(submitted_at)`)
        .orderBy(sql`DATE(submitted_at)`);
    }



    // Per-field stats
    const fieldStats = form.fields
      .filter((f) => f.type !== "section" && f.type !== "page_break")
      .map((field) => {
        const fieldAnswers = allResponses
          .map((r) => (r.answers as Record<string, FormAnswer>)[field.id])
          .filter((a) => a !== null && a !== undefined && a !== "");

        const responseCount = fieldAnswers.length;

        // Choice fields
        if (["radio", "checkbox", "select", "multi_select"].includes(field.type)) {
          const optionCounts: Record<string, number> = {};
          for (const answer of fieldAnswers) {
            const vals = Array.isArray(answer) ? answer : [answer];
            for (const v of vals) {
              if (typeof v === "string") {
                optionCounts[v] = (optionCounts[v] ?? 0) + 1;
              }
            }
          }
          const options = (field.options ?? []).map((o) => ({
            label: o.label,
            count: optionCounts[o.value] ?? 0,
          }));
          return {
            fieldId: field.id,
            label: field.label,
            type: field.type as FieldType,
            responseCount,
            optionCounts: options,
          };
        }

        // Rating / Scale
        if (["rating", "scale"].includes(field.type)) {
          const nums = fieldAnswers
            .map((a) => Number(a))
            .filter((n) => !isNaN(n));
          const average = nums.length
            ? parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1))
            : 0;
          const distMap: Record<number, number> = {};
          for (const n of nums) {
            distMap[n] = (distMap[n] ?? 0) + 1;
          }
          const distribution = Object.entries(distMap)
            .map(([v, c]) => ({ value: Number(v), count: c }))
            .sort((a, b) => a.value - b.value);
          return {
            fieldId: field.id,
            label: field.label,
            type: field.type as FieldType,
            responseCount,
            average,
            distribution,
          };
        }

        // Text fields
        const avgLength = fieldAnswers.length
          ? Math.round(
              fieldAnswers
                .map((a) => String(a).length)
                .reduce((acc, l) => acc + l, 0) / fieldAnswers.length
            )
          : 0;
        return {
          fieldId: field.id,
          label: field.label,
          type: field.type as FieldType,
          responseCount,
          avgLength,
        };
      });

    return {
      success: true,
      data: {
        totalResponses,
        completionRate: totalResponses > 0 ? 100 : 0, // simplified
        avgTimeTaken,
        responsesOverTime: responsesOverTime.map((r) => ({
          date: r.date,
          count: r.count,
        })),
        fieldStats,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

export async function exportResponsesCSV(formId: string, timezone = "UTC"): Promise<ActionResult<string>> {

  try {
    // Verify access (viewer role required for export)
    const form = await enforceFormAccess(formId, "viewer") as FormWithFields;
    if (!form) return { success: false, error: "Form not found" };

    // Fetch fields for headers
    form.fields = await db.query.formFields.findMany({
      where: eq(formFields.formId, formId),
      orderBy: [formFields.orderIndex],
    });

    const responses = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(desc(formResponses.submittedAt));

    const dataFields = form.fields.filter(
      (f) => f.type !== "section" && f.type !== "page_break"
    );

    const headers = [
      "Response ID",
      "Email",
      "Submitted At",
      ...dataFields.map((f) => f.label),
    ];

    const rows = responses.map((r) => {
      const answers = r.answers as Record<string, FormAnswer>;
      return [
        r.id,
        r.respondentEmail ?? "",
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: timezone,
          timeZoneName: "short",
        }).format(r.submittedAt),

        ...dataFields.map((f) => {
          const val = answers[f.id];
          if (f.type === "file") {
             if (Array.isArray(val)) {
                return val.map((path) => {
                   const name = String(path).split('/').pop() || String(path);
                   return name.replace(/^\d+_/, '');
                }).join("; ");
             }
             return String(val ?? "");
          }
          if (Array.isArray(val)) return val.join("; ");
          return String(val ?? "");
        }),
      ];
    });

    const escape = (v: string) =>
      v.includes(",") || v.includes('"') || v.includes("\n")
        ? `"${v.replace(/"/g, '""')}"`
        : v;

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escape(String(cell))).join(","))
      .join("\n");

    return { success: true, data: csv };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Form Storage Quota ───────────────────────────────────────────────────────

export async function checkFormStorageQuota(formId: string, uploadSizeBytes: number): Promise<ActionResult> {
  try {
    const form = await db.query.forms.findFirst({
      where: eq(forms.id, formId),
      columns: { userId: true, organizationId: true },
    });

    if (!form) return { success: false, error: "Form not found" };

    const isPersonal = !form.organizationId;
    const conditions = isPersonal
      ? and(isNull(assets.organizationId), eq(assets.userId, form.userId!))
      : and(isNotNull(assets.organizationId), eq(assets.organizationId, form.organizationId!));

    const [row] = await db
      .select({ totalBytes: sum(assets.size) })
      .from(assets)
      .where(conditions);

    const currentBytes = Number(row.totalBytes ?? 0);
    if (currentBytes + uploadSizeBytes > 100 * 1024 * 1024) {
      return { success: false, error: "Form owner has reached their file limit." };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Get Public Form Status (for pre-submit checks) ───────────────────────────

export async function getPublicFormStatus(formId: string): Promise<ActionResult<{
  acceptResponses: boolean;
  status: string;
  requireAuth: boolean;
  isAuthenticated: boolean;
}>> {
  try {
    const form = await db.query.forms.findFirst({
      where: eq(forms.id, formId),
      columns: { id: true, acceptResponses: true, status: true, requireAuth: true },
    });

    if (!form) return { success: false, error: "Form not found" };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return {
      success: true,
      data: {
        acceptResponses: form.acceptResponses,
        status: form.status,
        requireAuth: form.requireAuth,
        isAuthenticated: !!user,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
