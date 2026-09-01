import { Metadata } from "next";
import FeatureDetailPageClient from "./_client";

type Props = {
  params: Promise<{ slug: string }>;
};

const TITLES: Record<string, string> = {
  "form-builder": "Interactive Form Builder",
  "logic-branching": "Logic & Branching",
  "branding": "Design & Customization",
  "analytics": "Advanced Analytics",
  "security": "Security & Compliance",
  "api-reference": "API & Developer Tools",
  "collaboration": "Teams & Collaboration",
  "scheduling": "Form Scheduling & Limits",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = TITLES[slug] || "Feature Detail";
  
  return {
    title: `${title} - FormTo.Link Resources`,
    description: `Deep dive into the ${title} feature of FormTo.Link. Learn how to use it to its full potential.`,
  };
}

export default function FeatureDetailPage() {
  return <FeatureDetailPageClient />;
}
