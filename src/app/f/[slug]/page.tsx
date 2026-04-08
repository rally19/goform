import { getFormBySlug } from "@/lib/actions/forms";
import { FormRenderer } from "@/components/form-renderer/form-renderer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

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
  const { slug } = await params;
  const result = await getFormBySlug(slug);

  if (!result.success || !result.data) notFound();

  const { form, fields } = result.data;
  const accentColor = form.accentColor ?? "#6366f1";

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4">
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
          <FormRenderer form={form} fields={fields} />
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Powered by <span className="font-semibold text-foreground">GoForm</span>
        </p>
      </div>
    </div>
  );
}
