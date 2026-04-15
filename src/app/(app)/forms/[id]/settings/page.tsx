import { getForm } from "@/lib/actions/forms";
import { redirect } from "next/navigation";
import { SettingsClient } from "./_client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function FormSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsData params={params} />
    </Suspense>
  );
}

async function SettingsData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getForm(id);
  if (!result.success || !result.data) redirect("/forms");

  const { currentUserRole } = result.data;
  
  if (currentUserRole === "viewer") {
    redirect(`/forms/${id}/analytics`);
  }

  return (
    <SettingsClient formId={id} initialForm={result.data.form} />
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading settings...</p>
    </div>
  );
}
