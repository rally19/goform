import { Metadata } from "next";
import SupportPageClient from "./_client";

export const metadata: Metadata = {
  title: "Support Center | FormTo.Link",
  description: "Find help and support for FormTo.Link. Browse our documentation, FAQs, and get in touch with our team.",
};

export default function SupportPage() {
  return <SupportPageClient />;
}
