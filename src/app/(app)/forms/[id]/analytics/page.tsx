import { getFormAnalytics } from "@/lib/actions/responses";
import { getForm } from "@/lib/actions/forms";
import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "./_client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default async function FormAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsData params={params} />
    </Suspense>
  );
}

async function AnalyticsData({ params }: { params: Promise<{ id: string }> }) {
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

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
      <p className="text-sm text-muted-foreground animate-pulse">Analyzing responses...</p>
    </div>
  );
}
