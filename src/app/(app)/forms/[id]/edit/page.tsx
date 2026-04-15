import { getForm } from "@/lib/actions/forms";
import { BuilderCanvas } from "@/components/form-builder/builder-canvas";
import { Room } from "@/components/form-builder/room";
import type { BuilderField, BuilderForm } from "@/lib/form-types";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<BuilderSkeleton />}>
      <BuilderData params={params} />
    </Suspense>
  );
}

async function BuilderData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getForm(id);

  if (!result.success || !result.data) {
    redirect("/forms");
  }

  const { form, fields, currentUserRole, currentUserId } = result.data;
  
  if (currentUserRole === "viewer") {
    redirect(`/forms/${id}/results`);
  }

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
    lastToggledBy: (form as any).lastToggledBy,
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

  const canManageCollab =
    currentUserRole === "owner" || 
    currentUserRole === "manager" || 
    currentUserRole === "administrator";

  return (
    <Room roomId={id} initialForm={builderForm} initialFields={builderFields}>
      <BuilderCanvas
        formId={id}
        initialForm={builderForm}
        initialFields={builderFields}
        currentUserId={currentUserId}
        canManageCollab={canManageCollab}
      />
    </Room>
  );
}

function BuilderSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading builder...</p>
        <p className="text-xs text-muted-foreground/60">Connecting to realtime collaboration</p>
      </div>
    </div>
  );
}
