import { getForms } from "@/lib/actions/forms";
import { FormsListClient } from "./_components/forms-list-client";

export default async function FormsPage() {
  const result = await getForms();
  const forms = result.success && result.data ? result.data : [];

  return <FormsListClient initialForms={forms} />;
}
