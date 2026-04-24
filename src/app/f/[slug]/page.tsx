import { getFormBySlug } from "@/lib/actions/forms";
import { FormRenderer } from "@/components/form-renderer/form-renderer";
import { SafeHtml } from "@/components/ui/safe-html";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { stripHtml } from "@/lib/sanitize";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const unstable_instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getFormBySlug(slug);
  if (!result.success || !result.data) return { title: "Form" };
  return {
    title: stripHtml(result.data.form.title),
    description: result.data.form.description ? stripHtml(result.data.form.description) : undefined,
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

  const now = new Date();
  const startsAt = form.startsAt ? new Date(form.startsAt) : null;
  const endsAt = form.endsAt ? new Date(form.endsAt) : null;

  // Check form state
  const isBeforeStart = form.startsAtEnabled && startsAt && now < startsAt;
  const isAfterEnd = form.endsAtEnabled && endsAt && now >= endsAt;
  const isLimitReached = form.submissionLimitEnabled && form.submissionLimitDecremental 
    ? (form.submissionLimitRemaining ?? form.submissionLimit ?? 0) <= 0
    : false;

  // Determine form status message
  let statusMessage: { title: string; subtitle: string; icon: "clock" | "closed" | "limit" } | null = null;
  if (isBeforeStart) {
    statusMessage = { title: "Not yet open", subtitle: "This form is not yet accepting responses.", icon: "clock" };
  } else if (isAfterEnd) {
    statusMessage = { title: "Form closed", subtitle: "This form is no longer accepting responses.", icon: "closed" };
  } else if (isLimitReached) {
    statusMessage = { title: "Limit reached", subtitle: "This form has reached its submission limit.", icon: "limit" };
  }

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
            <SafeHtml 
              className="text-3xl font-bold tracking-tight prose-2xl max-w-full"
              html={form.title}
            />
            {form.description && (
              <SafeHtml 
                className="text-foreground/80 mt-3 prose-lg max-w-full preserve-spaces"
                html={form.description}
              />
            )}
            {/* Show end date under description when form is active */}
            {(!isBeforeStart && !isAfterEnd && !isLimitReached) && form.showEndsAt && endsAt && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                  </svg>
                  Closes {endsAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Form renderer or status message */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-8">
          {statusMessage ? (
            <div className="text-center space-y-3 py-8">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                {statusMessage.icon === "clock" && (
                  <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                {statusMessage.icon === "closed" && (
                  <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-2.25.75h13.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z" />
                  </svg>
                )}
                {statusMessage.icon === "limit" && (
                  <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.592-2.641M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-semibold">{statusMessage.title}</h2>
              <p className="text-sm text-muted-foreground">{statusMessage.subtitle}</p>
              {isBeforeStart && form.showStartsAt && startsAt && (
                <p className="text-xs text-muted-foreground pt-1">
                  Opens {startsAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
              {isAfterEnd && form.showEndsAt && endsAt && (
                <p className="text-xs text-muted-foreground pt-1">
                  Closed {endsAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
          ) : (
            <FormRenderer form={form} fields={fields} sections={sections} logic={logic} mode="public" isAuthenticated={isAuthenticated} />
          )}
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
