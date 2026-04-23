import { Metadata } from "next";
import ResourcesPageClient from "./_client";

export const metadata: Metadata = {
  title: "Resources & Guides - FormTo.Link",
  description: "Learn how to build better forms, optimize conversions, and grow your business with FormTo.Link.",
};

export default function ResourcesPage() {
  return <ResourcesPageClient />;
}
