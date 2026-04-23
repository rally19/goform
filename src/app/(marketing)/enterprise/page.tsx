import { Metadata } from "next";
import EnterprisePageClient from "./_client";

export const metadata: Metadata = {
  title: "Enterprise Solutions - FormTo.Link",
  description: "Enterprise-grade security, scalability, and dedicated support for large-scale operations.",
};

export default function EnterprisePage() {
  return <EnterprisePageClient />;
}
