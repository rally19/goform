import { getForm } from "@/lib/actions/forms";
import { redirect } from "next/navigation";
import { SettingsClient } from "./_client";

export default async function FormSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getForm(id);
  if (!result.success || !result.data) redirect("/forms");

  const { currentUserRole } = result.data;
  
  // Viewers are redirected to analytics
  if (currentUserRole === "viewer") {
    redirect(`/forms/${id}/analytics`);
  }

  return (
    <SettingsClient formId={id} initialForm={result.data.form} />
  );
}
