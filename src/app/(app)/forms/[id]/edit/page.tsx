import { getForm } from "@/lib/actions/forms";
import { BuilderCanvas } from "@/components/form-builder/builder-canvas";
import type { BuilderField, BuilderForm } from "@/lib/form-types";
import { redirect } from "next/navigation";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getForm(id);

  if (!result.success || !result.data) {
    redirect("/forms");
  }

  const { form, fields } = result.data;

  const builderForm: BuilderForm = {
    id: form.id,
    title: form.title,
    description: form.description ?? "",
    slug: form.slug,
    status: form.status,
    accentColor: form.accentColor,
    acceptResponses: form.acceptResponses,
    requireAuth: form.requireAuth,
    showProgress: form.showProgress,
    oneResponsePerUser: form.oneResponsePerUser,
    successMessage: form.successMessage,
    redirectUrl: form.redirectUrl ?? undefined,
    autoSave: form.autoSave,
    collaborationEnabled: form.collaborationEnabled,
  };

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
  }));

  return (
    <BuilderCanvas
      formId={id}
      initialForm={builderForm}
      initialFields={builderFields}
    />
  );
}
