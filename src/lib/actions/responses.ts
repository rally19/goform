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
    turnstileToken?: string;
    previewBypass?: boolean;
  }
): Promise<ActionResult<{ responseId: string }>> {
  try {
    // Verify Turnstile token if provided
    if (metadata?.turnstileToken) {
      const secret = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(metadata.turnstileToken)}`,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      });
      const turnstileData = await res.json();
      if (!turnstileData.success) {
        return { success: false, error: "Security check failed. Please refresh and try again." };
      }
    }

    // Load form to check if accepting responses
    const form = await db.query.forms.findFirst({
      where: eq(forms.id, formId),
    });

    if (!form) return { success: false, error: "Form not found" };

    let isBypassed = false;
    if (metadata?.previewBypass && form.previewBypass) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // If the user has viewer access (meaning they can preview), we allow the bypass
          await enforceFormAccess(formId, "viewer");
          isBypassed = true;
        } catch (e) {
          // Ignore, isBypassed remains false
        }
      }
    }

    if (!isBypassed) {
      if (form.status === "draft") {
        return { success: false, error: "This form is not yet published" };
      }
      if (form.status === "closed") {
        return { success: false, error: "This form is closed" };
      }

      // Accept responses is the master gate — checked before date/limit controls
      if (!form.acceptResponses) {
        return { success: false, error: "This form is no longer accepting responses" };
      }

      const now = new Date();

      // End date overrides start date and submission limit
      if (form.endsAtEnabled && form.endsAt && now >= new Date(form.endsAt)) {
        return { success: false, error: "This form is no longer accepting responses" };
      }

      // Start date check
      if (form.startsAtEnabled && form.startsAt && now < new Date(form.startsAt)) {
        return { success: false, error: "This form is not yet open for submissions" };
      }

      // Submission limit check
      if (form.submissionLimitEnabled && form.submissionLimit != null) {
        if (form.submissionLimitDecremental) {
          // Decremental mode: use the remaining counter directly
          const remaining = form.submissionLimitRemaining ?? form.submissionLimit;
          if (remaining <= 0) {
            return { success: false, error: "This form has reached its submission limit" };
          }
        } else {
          // Count-existing mode: compare total responses to limit
          const [{ total }] = await db
            .select({ total: count(formResponses.id) })
            .from(formResponses)
            .where(eq(formResponses.formId, formId));
          if (total >= form.submissionLimit) {
            return { success: false, error: "This form has reached its submission limit" };
          }
        }
      }
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
    if (!isBypassed && form.oneResponsePerUser && user) {
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

    // Decrement remaining counter if in decremental mode
    if (
      form.submissionLimitEnabled &&
      form.submissionLimitDecremental &&
      form.submissionLimit != null
    ) {
      const current = form.submissionLimitRemaining ?? form.submissionLimit;
      await db
        .update(forms)
        .set({ submissionLimitRemaining: Math.max(0, current - 1) })
        .where(eq(forms.id, formId));
    }

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
      .filter((f) => !["section", "page_break", "paragraph", "divider", "video"].includes(f.type))
      .map((field) => {
        const fieldAnswers = allResponses
          .map((r) => (r.answers as Record<string, FormAnswer>)[field.id])
          .filter((a) => a !== null && a !== undefined && a !== "");

        const responseCount = fieldAnswers.length;

        // Grid fields
        if (["radio_grid", "checkbox_grid"].includes(field.type)) {
          const rows = (field.options ?? []) as { label: string; value: string }[];
          const cols = ((field.properties as any)?.columns ?? []) as { label: string; value: string }[];
          const rowStats = rows.map((row) => {
            const colCounts: Record<string, number> = {};
            for (const answer of fieldAnswers) {
              if (typeof answer === "object" && answer !== null && !Array.isArray(answer)) {
                const gridVal = answer as Record<string, string | string[]>;
                const rowAnswer = gridVal[row.value];
                if (rowAnswer) {
                  const vals = Array.isArray(rowAnswer) ? rowAnswer : [rowAnswer];
                  for (const v of vals) {
                    if (typeof v === "string") colCounts[v] = (colCounts[v] ?? 0) + 1;
                  }
                }
              }
            }
            return {
              rowLabel: row.label,
              columns: cols.map((c) => ({ label: c.label, count: colCounts[c.value] ?? 0 })),
            };
          });
          return {
            fieldId: field.id,
            label: field.label,
            type: field.type as FieldType,
            responseCount,
            gridStats: rowStats,
          };
        }

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
    const res = await getFormResponsesForExport(formId, timezone);
    if (!res.success || !res.data) return { success: false, error: res.error };

    const { headers, rows } = res.data;
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

import { stripHtml } from "@/lib/sanitize";

export async function getFormResponsesForExport(formId: string, timezone = "UTC"): Promise<ActionResult<{
  title: string;
  headers: string[];
  rows: string[][];
}>> {
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
      (f) => !["section", "page_break", "paragraph", "divider"].includes(f.type)
    );

    const headers = [
      "Response ID",
      "Email",
      "Submitted At",
      ...dataFields.map((f) => stripHtml(f.label)),
    ];

    const supabase = await createClient();

    const rows = await Promise.all(responses.map(async (r) => {
      const answers = r.answers as Record<string, FormAnswer>;
      
      const rowData = await Promise.all(dataFields.map(async (f) => {
        const rawVal = answers[f.id];
        
        // Helper to get label for an option value
        const getOptionLabel = (v: any) => {
          if (!v) return "";
          const options = f.options as { label: string, value: string }[] | undefined;
          if (!options) return String(v);
          const opt = options.find(o => o.value === String(v));
          return opt ? stripHtml(opt.label) : String(v);
        };

        if (f.type === "file") {
           if (Array.isArray(rawVal)) {
              const urls = await Promise.all(rawVal.map(async (path) => {
                 const { data } = await supabase.storage.from("form-uploads").createSignedUrl(String(path), 604800);
                 return data?.signedUrl ?? String(path);
              }));
              return urls.join("; ");
           }
           if (rawVal) {
              const { data } = await supabase.storage.from("form-uploads").createSignedUrl(String(rawVal), 604800);
              return data?.signedUrl ?? String(rawVal);
           }
           return "";
        }

        if (["radio_grid", "checkbox_grid"].includes(f.type) && typeof rawVal === "object" && rawVal !== null && !Array.isArray(rawVal)) {
           const gridVal = rawVal as Record<string, string | string[]>;
           const rows = (f.options as { label: string; value: string }[] | undefined) ?? [];
           const cols = (f.properties as any)?.columns as { label: string; value: string }[] | undefined ?? [];
           return rows.map((row) => {
             const rowAnswer = gridVal[row.value];
             if (!rowAnswer) return `${stripHtml(row.label)}: —`;
             if (Array.isArray(rowAnswer)) {
               const labels = rowAnswer.map((v) => cols?.find((c) => c.value === v)?.label ?? v).join(", ");
               return `${stripHtml(row.label)}: ${labels}`;
             }
             const colLabel = cols?.find((c) => c.value === rowAnswer)?.label ?? String(rowAnswer);
             return `${stripHtml(row.label)}: ${colLabel}`;
           }).join("; ");
        }

        if (["radio", "select", "checkbox", "multi_select"].includes(f.type)) {
           if (Array.isArray(rawVal)) {
              return rawVal.map(v => getOptionLabel(v)).join("; ");
           }
           return getOptionLabel(rawVal);
        }

        if (Array.isArray(rawVal)) return rawVal.join("; ");
        return String(rawVal ?? "");
      }));

      return [
        r.id,
        r.respondentEmail ?? "Anonymous",
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
        ...rowData,
      ];
    }));

    return { 
      success: true, 
      data: { 
        title: form.title,
        headers, 
        rows 
      } 
    };
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
      columns: {
        id: true, acceptResponses: true, status: true, requireAuth: true,
        endsAt: true, endsAtEnabled: true, startsAt: true, startsAtEnabled: true,
        submissionLimit: true, submissionLimitEnabled: true,
        submissionLimitRemaining: true, submissionLimitDecremental: true,
      },
    });

    if (!form) return { success: false, error: "Form not found" };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const now = new Date();
    let acceptResponses = form.acceptResponses;

    if (!acceptResponses) {
      // master gate already false — skip sub-checks
    } else if (form.endsAtEnabled && form.endsAt && now >= new Date(form.endsAt)) {
      acceptResponses = false;
    } else if (form.startsAtEnabled && form.startsAt && now < new Date(form.startsAt)) {
      acceptResponses = false;
    } else if (form.submissionLimitEnabled && form.submissionLimit != null) {
      if (form.submissionLimitDecremental) {
        const remaining = form.submissionLimitRemaining ?? form.submissionLimit;
        if (remaining <= 0) acceptResponses = false;
      } else {
        const [{ total }] = await db
          .select({ total: count(formResponses.id) })
          .from(formResponses)
          .where(eq(formResponses.formId, formId));
        if (total >= form.submissionLimit) acceptResponses = false;
      }
    }

    return {
      success: true,
      data: {
        acceptResponses,
        status: form.status,
        requireAuth: form.requireAuth,
        isAuthenticated: !!user,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Get Form Submission Count (for settings display) ─────────────────────────

export async function getFormSubmissionCount(
  formId: string
): Promise<ActionResult<{ count: number }>> {
  try {
    await enforceFormAccess(formId, "viewer");
    const [{ total }] = await db
      .select({ total: count(formResponses.id) })
      .from(formResponses)
      .where(eq(formResponses.formId, formId));
    return { success: true, data: { count: total } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
