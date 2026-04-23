import { Metadata } from "next";
import SolutionsPageClient from "./_client";

export const metadata: Metadata = {
  title: "Solutions | FormTo.Link",
  description: "Discover how FormTo.Link solves complex data collection challenges and innovates with real-time collaboration and smart logic.",
};

export default function SolutionsPage() {
  return <SolutionsPageClient />;
}
