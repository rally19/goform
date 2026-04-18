import { getForm } from "@/lib/actions/forms";
import { FormRenderer } from "@/components/form-renderer/form-renderer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export const unstable_instant = { 
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'goform_workspace', value: null },
        { name: 'sb-access-token', value: null },
        { name: 'sb-refresh-token', value: null }
      ],
      params: { id: 'sample-form-id' }
    }
  ]
};

export default async function FormPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PreviewSkeleton />}>
      <PreviewPageData params={params} />
    </Suspense>
  );
}

async function PreviewPageData({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getForm(id);

  if (!result.success || !result.data) {
    redirect("/forms");
  }

  const { form, fields, sections } = result.data;
  const accentColor = form.accentColor ?? "#6366f1";

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4 animate-in fade-in duration-500">
      {/* Preview banner */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-2.5 flex items-center justify-between text-sm shadow-sm ring-1 ring-amber-900/5">
          <span className="text-amber-800 dark:text-amber-300 font-medium">
            👁 Preview Mode — responses won&apos;t be saved
          </span>
          <Link
            href={`/forms/${id}/edit`}
            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 text-xs underline"
          >
            Back to editor
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Form header card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-2.5" style={{ backgroundColor: accentColor }} />
          <div className="p-8 pb-6">
            <h1 className="text-3xl font-bold tracking-tight">{form.title}</h1>
            {form.description && (
              <p className="text-muted-foreground mt-3">{form.description}</p>
            )}
          </div>
          <div className="px-8 pb-4">
            <div className="border-t border-border pt-3 text-xs text-destructive font-medium">
              * Indicates required question
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-8">
          <FormRenderer form={form} fields={fields} sections={sections} />
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Powered by <span className="font-semibold text-foreground">GoForm</span>
        </p>
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4 animate-pulse">
      {/* Banner placeholder */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="h-10 w-full bg-amber-50/50 dark:bg-amber-950/10 rounded-lg border border-amber-200/50 dark:border-amber-900/30" />
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header card skeleton */}
        <div className="rounded-xl border border-border bg-card/50 shadow-sm overflow-hidden">
          <div className="h-2.5 bg-primary/10" />
          <div className="p-8 pb-6 space-y-3">
            <div className="h-8 w-2/3 bg-primary/5 rounded-md" />
            <div className="h-4 w-full bg-primary/5 rounded-md" />
            <div className="h-4 w-1/2 bg-primary/5 rounded-md" />
          </div>
        </div>

        {/* Form renderer skeleton */}
        <div className="rounded-xl border border-border bg-card/50 shadow-sm p-8 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 w-1/4 bg-primary/5 rounded-md" />
              <div className="h-10 w-full bg-primary/5 rounded-md border border-border/50" />
            </div>
          ))}
          <div className="h-10 w-24 bg-primary/10 rounded-md ml-auto" />
        </div>

        <p className="text-center text-xs text-muted-foreground opacity-50 pb-8">
          Powered by <span className="font-semibold text-foreground">GoForm</span>
        </p>
      </div>
    </div>
  );
}
