"use server";

import { db } from "@/db";
import { forms, formFields, formResponses, assets } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq, desc, and, count, sql, gt, gte, isNull, isNotNull, sum } from "drizzle-orm";
import { enforceFormAccess } from "./forms";
import type { ActionResult, FormAnswer, FormAnalytics, ResponseRow, FieldType, BuilderField, LogicRule } from "@/lib/form-types";
import { evaluateLogic, isAnswerEmpty } from "@/lib/form-logic";

type FormWithFields = typeof forms.$inferSelect & {
  fields: (typeof formFields.$inferSelect)[];
};

// ─── Server-side validation ───────────────────────────────────────────────────

/** Field types that don't accept input — never validated. */
const NON_INPUT_TYPES = new Set([
  "section", "page_break", "paragraph", "divider", "video",
]);

/**
 * Re-runs the logic engine and validates required fields, min/max, lengths,
 * and patterns server-side. Returns the first error message, or null if OK.
 *
 * The client also runs this, but it is not authoritative.
 */
function validateAnswersServerSide(
  form: FormWithFields,
  answers: Record<string, FormAnswer>,
): string | null {
  const builderFields: BuilderField[] = form.fields.map((f) => ({
    id: f.id,
    type: f.type as BuilderField["type"],
    label: f.label,
    description: f.description ?? undefined,
    placeholder: f.placeholder ?? undefined,
    required: f.required,
    orderIndex: f.orderIndex,
    options: (f.options as BuilderField["options"]) ?? undefined,
    validation: (f.validation as BuilderField["validation"]) ?? undefined,
    properties: (f.properties as BuilderField["properties"]) ?? undefined,
    sectionId: f.sectionId ?? undefined,
  }));

  const rules = (form.logic ?? []) as unknown as LogicRule[];
  const { states } = evaluateLogic(builderFields, rules, answers);

  for (const f of builderFields) {
    if (NON_INPUT_TYPES.has(f.type)) continue;
    const state = states[f.id] ?? { visible: true, enabled: true, required: f.required, masked: false };
    // Hidden / disabled fields don't need to satisfy required (matches the
    // client's behaviour and avoids false rejections from skip-to-section flows).
    if (!state.visible || !state.enabled) continue;

    const value = answers[f.id];

    // Required
    if (state.required) {
      if (f.type === "radio_grid" || f.type === "checkbox_grid") {
        const rows = (f.options ?? []) as { value: string }[];
        const grid = (value && typeof value === "object" && !Array.isArray(value))
          ? value as Record<string, string | string[]>
          : {};
        for (const row of rows) {
          const v = grid[row.value];
          if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
            return `"${f.label}": all rows are required`;
          }
        }
      } else if (isAnswerEmpty(value)) {
        return `"${f.label}" is required`;
      } else if (f.type === "rating" && value === 0) {
        return `"${f.label}" is required`;
      }
    }

    if (isAnswerEmpty(value)) continue;

    const v = f.validation ?? {};

    // Length checks (text-ish fields)
    if (typeof value === "string") {
      if (typeof v.minLength === "number" && value.length < v.minLength) {
        return `"${f.label}" must be at least ${v.minLength} characters`;
      }
      if (typeof v.maxLength === "number" && value.length > v.maxLength) {
        return `"${f.label}" must be at most ${v.maxLength} characters`;
      }
      if (v.pattern) {
        try {
          if (!new RegExp(v.pattern).test(value)) {
            return `"${f.label}" has an invalid format`;
          }
        } catch {
          // bad pattern in the form definition — skip silently
        }
      }
    }

    // Numeric / scale / rating range
    if (f.type === "number" || f.type === "scale" || f.type === "rating") {
      const n = Number(value as string | number);
      if (!Number.isFinite(n)) {
        return `"${f.label}" must be a number`;
      }
      if (typeof v.min === "number" && n < v.min) {
        return `"${f.label}" must be ≥ ${v.min}`;
      }
      if (typeof v.max === "number" && n > v.max) {
        return `"${f.label}" must be ≤ ${v.max}`;
      }
    }

    // Choice answers must come from the declared option set.
    if ((f.type === "radio" || f.type === "select") && typeof value === "string") {
      const allowed = (f.options ?? []).map((o) => o.value);
      if (allowed.length > 0 && !allowed.includes(value)) {
        return `"${f.label}" has an unknown option selected`;
      }
    }
    if ((f.type === "checkbox" || f.type === "multi_select" || f.type === "ranking") && Array.isArray(value)) {
      const allowed = new Set((f.options ?? []).map((o) => o.value));
      for (const item of value) {
        if (typeof item === "string" && allowed.size > 0 && !allowed.has(item)) {
          return `"${f.label}" has an unknown option selected`;
        }
      }
    }
  }

  return null;
}

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

    // Load form + fields together so we can validate server-side
    const form = await db.query.forms.findFirst({
      where: eq(forms.id, formId),
      with: { fields: true },
    }) as FormWithFields | undefined;

    if (!form) return { success: false, error: "Form not found" };

    let isBypassed = false;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (metadata?.previewBypass && form.previewBypass) {
      if (user) {
        try {
          // Preview-bypass skips status/date/limit/auth gating, so it must be
          // restricted to people who can actually edit the form — viewers
          // (lowest tier) shouldn't be able to inject responses into a closed
          // or unpublished form.
          await enforceFormAccess(formId, "editor");
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

      // Non-decremental limit check (point-in-time; the decremental path is
      // enforced atomically inside the transaction below to avoid races).
      if (
        form.submissionLimitEnabled &&
        form.submissionLimit != null &&
        !form.submissionLimitDecremental
      ) {
        const [{ total }] = await db
          .select({ total: count(formResponses.id) })
          .from(formResponses)
          .where(eq(formResponses.formId, formId));
        if (total >= form.submissionLimit) {
          return { success: false, error: "This form has reached its submission limit" };
        }
      }
    }

    // Check auth if required (or if oneResponsePerUser is on — otherwise that
    // toggle is silently a no-op for anonymous submissions).
    let respondentId: string | undefined;
    let respondentEmail: string | undefined;

    if (form.requireAuth || (!isBypassed && form.oneResponsePerUser)) {
      if (!user) {
        return {
          success: false,
          error: form.requireAuth
            ? "Authentication required"
            : "This form requires sign-in so each respondent can only submit once",
        };
      }
      respondentId = user.id;
      respondentEmail = user.email ?? undefined;
    } else if (user) {
      // Still attribute the response to the user when authenticated, even if
      // not strictly required — useful for one-response-per-user later.
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

    // ── Server-side answer validation ───────────────────────────────────────
    // Drop unknown field IDs, run the logic engine, and enforce required
    // / min / max / length / pattern. Client-side validation is convenience;
    // this is the source of truth.
    const validationError = validateAnswersServerSide(form, answers);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Strip unknown ids so attackers can't smuggle data into the answers JSON.
    const knownIds = new Set(form.fields.map((f) => f.id));
    const filteredAnswers: Record<string, FormAnswer> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (knownIds.has(k)) filteredAnswers[k] = v;
    }

    // Insert + decremental limit update happen atomically.
    let response: { id: string } | undefined;
    try {
      response = await db.transaction(async (tx) => {
        if (
          !isBypassed &&
          form.submissionLimitEnabled &&
          form.submissionLimitDecremental &&
          form.submissionLimit != null
        ) {
          // Atomic decrement: only succeeds while remaining > 0.
          // COALESCE so first-time forms (remaining=null) seed from the limit.
          const updated = await tx
            .update(forms)
            .set({
              submissionLimitRemaining: sql`GREATEST(COALESCE(${forms.submissionLimitRemaining}, ${forms.submissionLimit}) - 1, 0)`,
            })
            .where(
              and(
                eq(forms.id, formId),
                gt(
                  sql`COALESCE(${forms.submissionLimitRemaining}, ${forms.submissionLimit})`,
                  0,
                ),
              ),
            )
            .returning({ remaining: forms.submissionLimitRemaining });

          if (updated.length === 0) {
            // Roll back: limit already reached by a concurrent submission.
            throw new Error("__LIMIT_REACHED__");
          }
        }

        const [row] = await tx
          .insert(formResponses)
          .values({
            formId,
            respondentId: respondentId ?? null,
            respondentEmail: respondentEmail ?? null,
            answers: filteredAnswers,
            metadata: metadata ?? null,
          })
          .returning({ id: formResponses.id });
        return row;
      });
    } catch (txErr) {
      if ((txErr as Error).message === "__LIMIT_REACHED__") {
        return { success: false, error: "This form has reached its submission limit" };
      }
      throw txErr;
    }

    if (!response) {
      return { success: false, error: "Failed to create response" };
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
          // Attribute to the respondent if signed in, then form owner (personal
          // forms), then null (org-owned forms with anonymous respondent).
          uploadedBy: respondentId ?? form.userId ?? null,
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
    const successSectionIds = new Set(
      (Array.isArray(form.sections) ? form.sections as { id: string; type?: string }[] : [])
        .filter((s) => s.type === "success")
        .map((s) => s.id)
    );
    const fieldStats = form.fields
      .filter((f) => !f.sectionId || !successSectionIds.has(f.sectionId))
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

        // Ranking — average rank per option (1 = best)
        if (field.type === "ranking") {
          const opts = (field.options ?? []) as { label: string; value: string }[];
          const sums: Record<string, number> = {};
          const counts: Record<string, number> = {};
          for (const answer of fieldAnswers) {
            if (!Array.isArray(answer)) continue;
            (answer as unknown[]).forEach((v, idx) => {
              const key = String(v);
              sums[key] = (sums[key] ?? 0) + idx + 1;
              counts[key] = (counts[key] ?? 0) + 1;
            });
          }
          // Sort options by average rank (lower is better). Show count of times ranked first as the bar count.
          const optionCounts = opts
            .map((o) => {
              const c = counts[o.value] ?? 0;
              const avg = c > 0 ? sums[o.value] / c : 0;
              return {
                label: o.label,
                count: c > 0 ? parseFloat(((opts.length + 1 - avg)).toFixed(2)) : 0,
                _avgRank: avg,
              };
            })
            .sort((a, b) => (a._avgRank || 999) - (b._avgRank || 999))
            .map(({ label, count }) => ({ label, count }));
          return {
            fieldId: field.id,
            label: field.label,
            type: field.type as FieldType,
            responseCount,
            optionCounts,
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

        // Signature — only response count is meaningful (data URL length is noise).
        if (field.type === "signature" || field.type === "file") {
          return {
            fieldId: field.id,
            label: field.label,
            type: field.type as FieldType,
            responseCount,
            avgLength: 0,
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

    const successSectionIds = new Set(
      (Array.isArray(form.sections) ? form.sections as { id: string; type?: string }[] : [])
        .filter((s) => s.type === "success")
        .map((s) => s.id)
    );
    const dataFields = form.fields.filter(
      (f) => (!f.sectionId || !successSectionIds.has(f.sectionId)) &&
        !["section", "page_break", "paragraph", "divider", "video"].includes(f.type)
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

        if (f.type === "signature" && rawVal && typeof rawVal === "object" && !Array.isArray(rawVal)) {
           const sig = rawVal as { kind?: string; text?: string };
           if (sig.kind === "type" && sig.text) return `[Signature: ${sig.text}]`;
           return `[Signature: ${sig.kind ?? "drawn"}]`;
        }

        if (f.type === "ranking" && Array.isArray(rawVal)) {
           return (rawVal as unknown[])
             .map((v, i) => `${i + 1}. ${getOptionLabel(v)}`)
             .join("; ");
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
