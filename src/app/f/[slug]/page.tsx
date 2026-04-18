import { getFormBySlug } from "@/lib/actions/forms";
import { FormRenderer } from "@/components/form-renderer/form-renderer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const unstable_instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getFormBySlug(slug);
  if (!result.success || !result.data) return { title: "Form" };
  return {
    title: result.data.form.title,
    description: result.data.form.description ?? undefined,
  };
}

export default async function PublicFormPage({ params }: PageProps) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <FormPageData params={params} />
    </Suspense>
  );
}

async function FormPageData({ params }: PageProps) {
  const { slug } = await params;
  const result = await getFormBySlug(slug);

  if (!result.success || !result.data) notFound();

  const { form, fields, sections } = result.data;
  const accentColor = form.accentColor ?? "#6366f1";

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4 animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-2.5" style={{ backgroundColor: accentColor }} />
          <div className="p-8 pb-6">
            <h1 className="text-3xl font-bold tracking-tight">{form.title}</h1>
            {form.description && (
              <p className="text-muted-foreground mt-3">{form.description}</p>
            )}
          </div>
          {fields.some((f) => f.required) && (
            <div className="px-8 pb-4">
              <div className="border-t border-border pt-3 text-xs text-destructive font-medium">
                * Indicates required question
              </div>
            </div>
          )}
        </div>

        {/* Form renderer */}
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

function FormSkeleton() {
  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4 animate-pulse">
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
