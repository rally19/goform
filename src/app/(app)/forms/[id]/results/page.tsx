import { getFormResponses } from "@/lib/actions/responses";
import { getForm } from "@/lib/actions/forms";
import { redirect } from "next/navigation";
import { ResultsClient } from "./_client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { stripHtml } from "@/lib/sanitize";

export const unstable_instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getForm(id);
  if (!result.success || !result.data) return { title: "Form Results" };
  return {
    title: `Results: ${stripHtml(result.data.form.title)}`,
  };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <ResultsData params={params} />
    </Suspense>
  );
}

async function ResultsData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [formResult, responsesResult] = await Promise.all([
    getForm(id),
    getFormResponses(id, 0, 50),
  ]);

  if (!formResult.success || !formResult.data?.form) redirect("/forms");

  const sections = formResult.data.sections ?? [];
  const successSectionIds = new Set(
    sections.filter((s) => s.type === "success").map((s) => s.id)
  );
  const fields = (formResult.data.fields ?? []).filter(
    (f) => !f.sectionId || !successSectionIds.has(f.sectionId)
  );
  const initialResponses = responsesResult.success && responsesResult.data 
    ? responsesResult.data 
    : { responses: [], total: 0 };

  return (
    <ResultsClient
      formId={id}
      form={formResult.data.form}
      fields={fields}
      initialResponses={initialResponses}
    />
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading responses...</p>
    </div>
  );
}
