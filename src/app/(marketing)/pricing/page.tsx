import { Metadata } from "next";
import PricingPageClient from "./_client";

export const metadata: Metadata = {
  title: "Pricing - FormTo.Link",
  description: "Simple, transparent pricing for teams of all sizes. Start for free and grow with us.",
};

export default function PricingPage() {
  return <PricingPageClient />;
}
