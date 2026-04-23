import { Metadata } from "next";
import LandingPageClient from "./_client";

export const metadata: Metadata = {
  title: "FormTo.Link - Modern Form Builder for Teams",
  description: "Create beautiful, conversion-optimized forms in minutes. The easiest way to collect data and connect with your audience.",
};

export default function LandingPage() {
  return <LandingPageClient />;
}
