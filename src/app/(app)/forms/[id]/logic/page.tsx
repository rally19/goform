import { getForm } from "@/lib/actions/forms";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LogicClient } from "./_client";
import type { BuilderField } from "@/lib/form-types";

export const unstable_instant = false;

export default async function FormLogicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LogicSkeleton />}>
      <LogicData params={params} />
    </Suspense>
  );
}

async function LogicData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getForm(id);
  if (!result.success || !result.data) redirect("/forms");

  const { form, fields, sections, logic, currentUserRole } = result.data;

  if (currentUserRole === "viewer") {
    redirect(`/forms/${id}/results`);
  }

  const builderFields: BuilderField[] = fields.map((f) => ({
    id: f.id,
    type: f.type,
    label: f.label,
    description: f.description ?? undefined,
    placeholder: f.placeholder ?? undefined,
    required: f.required,
    orderIndex: f.orderIndex,
    options: f.options ?? undefined,
    validation: f.validation ?? undefined,
    properties: f.properties ?? undefined,
    sectionId: f.sectionId ?? undefined,
  }));

  return (
    <LogicClient
      formId={id}
      formTitle={form.title}
      fields={builderFields}
      sections={sections}
      initialLogic={logic}
    />
  );
}

function LogicSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading logic...</p>
    </div>
  );
}
