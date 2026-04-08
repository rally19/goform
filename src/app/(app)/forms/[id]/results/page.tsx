import { getFormResponses } from "@/lib/actions/responses";
import { getForm } from "@/lib/actions/forms";
import { redirect } from "next/navigation";
import { ResultsClient } from "./_client";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [formResult, responsesResult] = await Promise.all([
    getForm(id),
    getFormResponses(id, 0, 50),
  ]);

  if (!formResult.success || !formResult.data) redirect("/forms");

  return (
    <ResultsClient
      formId={id}
      form={formResult.data.form}
      fields={formResult.data.fields}
      initialResponses={responsesResult.success ? responsesResult.data! : { responses: [], total: 0 }}
    />
  );
}
