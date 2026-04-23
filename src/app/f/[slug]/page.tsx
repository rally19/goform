import { getFormBySlug } from "@/lib/actions/forms";
import { FormRenderer } from "@/components/form-renderer/form-renderer";
import { sanitize } from "@/lib/sanitize";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/server";
import { ThemeToggle } from "@/components/theme-toggle";

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

  const { form, fields, sections, logic } = result.data;
  const accentColor = form.accentColor ?? "#6366f1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <div className="relative min-h-screen py-10 px-4 animate-in fade-in duration-500">
      <div className="fixed inset-0 bg-muted/20 -z-10" />
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header card */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-2.5" style={{ backgroundColor: accentColor }} />
          <div className="p-8 pb-6">
            <h1 
              className="text-3xl font-bold tracking-tight prose-2xl max-w-full"
              dangerouslySetInnerHTML={{ __html: sanitize(form.title) }}
            />
            {form.description && (
              <div 
                className="text-muted-foreground mt-3 prose-lg max-w-full preserve-spaces"
                dangerouslySetInnerHTML={{ __html: sanitize(form.description) }}
              />
            )}
          </div>
        </div>

        {/* Form renderer */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-8">
          <FormRenderer form={form} fields={fields} sections={sections} logic={logic} mode="public" isAuthenticated={isAuthenticated} />
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Powered by <span className="font-semibold text-foreground">FormTo.Link</span>
        </p>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="relative min-h-screen py-10 px-4 animate-pulse">
      <div className="fixed inset-0 bg-muted/20 -z-10" />
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
