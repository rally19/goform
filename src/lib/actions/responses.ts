"use server";

import { db } from "@/db";
import { forms, formFields, formResponses } from "@/db/schema";
import { createClient } from "@/lib/server";
import { eq, desc, and, count, sql, gte } from "drizzle-orm";
import { enforceFormAccess } from "./forms";
import type { ActionResult, FormAnswer, FormAnalytics, ResponseRow, FieldType } from "@/lib/form-types";

type FormWithFields = typeof forms.$inferSelect & {
  fields: (typeof formFields.$inferSelect)[];
};

// ─── Submit Form Response ─────────────────────────────────────────────────────

export async function submitFormResponse(
  formId: string,
  answers: Record<string, FormAnswer>,
  metadata?: { timeTaken?: number }
): Promise<ActionResult<{ responseId: string }>> {
  try {
    // Load form to check if accepting responses
    const form = await db.query.forms.findFirst({
      where: eq(forms.id, formId),
    });

    if (!form) return { success: false, error: "Form not found" };
    if (!form.acceptResponses) {
      return { success: false, error: "This form is no longer accepting responses" };
    }
    if (form.status === "closed") {
      return { success: false, error: "This form is closed" };
    }

    // Check auth if required
    let respondentId: string | undefined;
    let respondentEmail: string | undefined;

    if (form.requireAuth) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Authentication required" };
      respondentId = user.id;
      respondentEmail = user.email ?? undefined;
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

    await db
      .delete(formResponses)
      .where(and(eq(formResponses.id, responseId), eq(formResponses.formId, formId)));

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Get Analytics ────────────────────────────────────────────────────────────

export async function getFormAnalytics(formId: string): Promise<ActionResult<FormAnalytics>> {
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

    const responsesOverTime = await db
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

export async function exportResponsesCSV(formId: string): Promise<ActionResult<string>> {
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
        r.submittedAt.toISOString(),
        ...dataFields.map((f) => {
          const val = answers[f.id];
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
