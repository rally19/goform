import { getForm } from "@/lib/actions/forms";
import { FormRenderer } from "@/components/form-renderer/form-renderer";
import { sanitize } from "@/lib/sanitize";
import { forbidden } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export const unstable_instant = false;

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
    return forbidden();
  }

  const { form, fields, sections, logic } = result.data;
  const accentColor = form.accentColor ?? "#6366f1";

  return (
    <div className="relative min-h-screen py-10 px-4 animate-in fade-in duration-500">
      <div className="fixed inset-0 bg-muted/20 -z-10" />
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Preview banner */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-2.5 flex items-center justify-between text-sm shadow-sm ring-1 ring-amber-900/5">
          <span className="text-amber-800 dark:text-amber-300 font-medium">
            👁 Preview Mode — only accessible to form collaborators
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
            <h1 
              className="text-3xl font-bold tracking-tight prose-2xl max-w-full"
              dangerouslySetInnerHTML={{ __html: sanitize(form.title) }}
            />
            {form.description && (
              <div 
                className="text-muted-foreground mt-3 prose-lg max-w-full"
                dangerouslySetInnerHTML={{ __html: sanitize(form.description) }}
              />
            )}
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-8">
          <FormRenderer form={form} fields={fields} sections={sections} logic={logic} mode="preview" />
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Powered by <span className="font-semibold text-foreground">FormTo.Link</span>
        </p>
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="relative min-h-screen py-10 px-4 animate-pulse">
      <div className="fixed inset-0 bg-muted/20 -z-10" />
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
          Powered by <span className="font-semibold text-foreground">FormTo.Link</span>
        </p>
      </div>
    </div>
  );
}
