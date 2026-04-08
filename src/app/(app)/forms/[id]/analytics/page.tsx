import { getFormAnalytics } from "@/lib/actions/responses";
import { getForm } from "@/lib/actions/forms";
import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "./_client";

export default async function FormAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [formResult, analyticsResult] = await Promise.all([
    getForm(id),
    getFormAnalytics(id),
  ]);

  if (!formResult.success || !formResult.data) redirect("/forms");

  const analytics = analyticsResult.success && analyticsResult.data
    ? analyticsResult.data
    : null;

  return (
    <AnalyticsDashboard
      formId={id}
      form={formResult.data.form}
      analytics={analytics}
    />
  );
}
