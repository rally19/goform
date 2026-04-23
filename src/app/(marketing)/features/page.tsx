import { Metadata } from "next";
import FeaturesPageClient from "./_client";

export const metadata: Metadata = {
  title: "Features - FormTo.Link",
  description: "Explore the powerful capabilities of FormTo.Link, from visual form building to advanced analytics.",
};

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}
