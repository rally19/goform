import { getFormResponses } from "@/lib/actions/responses";
import { getForm } from "@/lib/actions/forms";
import { redirect } from "next/navigation";
import { ResultsClient } from "./_client";
export const unstable_instant = { 
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'goform_workspace', value: null },
        { name: 'sb-access-token', value: null },
        { name: 'sb-refresh-token', value: null },
        { name: 'sidebar_state', value: null }
      ],
      params: { id: 'sample-form-id' }
    }
  ]
};
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

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

  const fields = formResult.data.fields ?? [];
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
