"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Layout, BarChart3, Puzzle, Shield, Sparkles, Rocket, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONTENT = {
  "form-builder": {
    title: "Interactive Form Builder",
    subtitle: "The most intuitive drag-and-drop experience for modern teams.",
    icon: Layout,
    color: "bg-blue-500",
    description: "Our form builder is designed to be powerful yet simple. No more fighting with complex interfaces. Just drag, drop, and publish.",
    features: [
      "Real-time visual preview as you build",
      "Over 20+ field types including file uploads",
      "Section and page break management",
      "Rich text support for descriptions",
      "Auto-save so you never lose your work"
    ],
    detailedContent: "Building a form should be as easy as writing a document. With FormTo.Link, we've reimagined the form-building experience from the ground up. Our interface allows you to build complex multi-page forms with sections and dividers in a matter of minutes."
  },
  "analytics": {
    title: "Insightful Analytics",
    subtitle: "Turn submissions into actionable data.",
    icon: BarChart3,
    color: "bg-emerald-500",
    description: "Don't just collect data—understand it. Our analytics dashboard provides clear visualizations of your form performance.",
    features: [
      "Submission volume over time charts",
      "Detailed field-level breakdown stats",
      "Average completion time tracking",
      "Choice and rating distribution charts",
      "Export to CSV, XLSX, or PDF formats"
    ],
    detailedContent: "Knowing how many people filled out your form is only the beginning. You need to know the average time it takes to complete and see exactly how your respondents are answering specific questions. Our analytics work automatically without any extra setup."
  },
  "logic-branching": {
    title: "Logic & Branching",
    subtitle: "Forms that adapt to your users.",
    icon: Puzzle,
    color: "bg-purple-500",
    description: "Create smart forms that adapt to user responses in real-time. Only show relevant questions and improve completion rates.",
    features: [
      "Conditional field visibility (Show/Hide)",
      "Skip to specific pages or sections",
      "Mathematical formula support",
      "Set field values automatically",
      "Redirect to URLs based on answers"
    ],
    detailedContent: "Users hate answering irrelevant questions. Logic branching allows you to create a personalized experience for every respondent. Use mathematical formulas to calculate scores or values on the fly, and redirect users to different destinations based on their input."
  },
  "security": {
    title: "Secure Data Collection",
    subtitle: "Enterprise-grade security by default.",
    icon: Shield,
    color: "bg-red-500",
    description: "We take security seriously. Every form and submission is stored securely with modern encryption standards.",
    features: [
      "Secure Supabase-backed infrastructure",
      "JWT-based authentication and authorization",
      "Row-Level Security (RLS) for data privacy",
      "Encrypted file storage and transfers",
      "Protected API access with secure keys"
    ],
    detailedContent: "Trust is the foundation of any data collection. We ensure that your forms are not only secure from external threats but also isolated so only authorized team members can access sensitive respondent data. Our infrastructure is built on industry-leading security patterns."
  },
  "branding": {
    title: "Customization",
    subtitle: "Match your forms to your style.",
    icon: Sparkles,
    color: "bg-amber-500",
    description: "Make your forms look professional and integrated. Control the visual presentation to match your project's identity.",
    features: [
      "Custom accent color selection",
      "Personalized success messages",
      "Branded redirect destinations",
      "Clean, distraction-free layouts",
      "Mobile-responsive design themes"
    ],
    detailedContent: "A form that looks out of place can hurt conversion rates. FormTo.Link gives you the tools to create forms that feel consistent with your brand. Adjust colors, set custom completion messages, and ensure your forms look great on every device."
  },
  "integrations": {
    title: "Developer & Team API",
    subtitle: "Connect your data to your stack.",
    icon: Rocket,
    color: "bg-indigo-500",
    description: "Automate your workflow by accessing your form data programmatically via our API and secure keys.",
    features: [
      "Full API access with hashed keys",
      "Real-time collaboration for teams",
      "Programmatic response retrieval",
      "Data export to CSV, XLSX, and PDF",
      "Webhooks and Zapier (Coming Soon)"
    ],
    detailedContent: "Collecting data is just the beginning. Our API allows you to integrate form responses directly into your own applications or internal tools. Collaborate with your team in real-time as you build and manage your forms."
  },
  "api-reference": {
    title: "API & Developer Tools",
    subtitle: "Build custom integrations and extend FormTo.Link.",
    icon: Rocket,
    color: "bg-violet-500",
    description: "Secure API keys, programmatic access, and developer-friendly tools to extend FormTo.Link into your own stack.",
    features: [
      "Hashed API keys with prefix tracking",
      "Programmatic response retrieval",
      "Secure key storage with last-used timestamps",
      "Webhook support planned for v1.1",
      "Full developer documentation"
    ],
    detailedContent: "Our developer tools give you the power to build custom integrations. Every API key is hashed for security, and you can track usage with last-used timestamps. Webhook support is on the roadmap for v1.1, bringing real-time event-driven automation to your workflows."
  },
  "workflow-automation": {
    title: "Workflow Automation",
    subtitle: "Automate your data collection pipeline.",
    icon: Puzzle,
    color: "bg-cyan-500",
    description: "Connect your forms to the rest of your stack and automate repetitive tasks with conditional logic and scheduled actions.",
    features: [
      "Conditional logic and branching rules",
      "Custom redirect URLs on completion",
      "Submission limit and schedule windows",
      "Auto-save and collaboration sync",
      "Webhook support planned for v1.1"
    ],
    detailedContent: "Workflow automation turns your forms into active participants in your business processes. Use conditional logic to route respondents to different outcomes, set submission limits for capacity planning, and schedule forms to open and close automatically."
  }
};

export default function FeatureDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const content = CONTENT[slug as keyof typeof CONTENT];

  if (!content) {
    return (
      <div className="container py-32 text-center">
        <h1 className="text-4xl font-bold mb-4">Resource Not Found</h1>
        <p className="text-muted-foreground mb-8">We couldn't find the resource you're looking for.</p>
        <Button onClick={() => router.push("/resources")}>Back to Resources</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="bg-muted/30 border-b border-border py-12 md:py-20">
        <div className="container px-4 md:px-6">
          <Link
            href="/resources"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Resources
          </Link>
          
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            <div className="flex-1 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn("p-4 rounded-2xl w-fit text-white", content.color)}
              >
                <content.icon className="h-10 w-10" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-bold tracking-tight"
              >
                {content.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-muted-foreground leading-relaxed"
              >
                {content.subtitle}
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full lg:w-[400px] bg-card border border-border rounded-3xl p-8 shadow-xl"
            >
              <h3 className="text-xl font-bold mb-6">Key Capabilities</h3>
              <div className="space-y-4">
                {content.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm md:text-base leading-snug">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" className="w-full">
                <Button className="w-full mt-8 bg-primary h-12 text-lg font-bold">
                  Try it yourself
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 container px-4 md:px-6">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-6">Overview</h2>
            <p className="text-lg text-muted-foreground leading-loose">
              {content.description}
            </p>
            <div className="my-12 p-8 rounded-3xl bg-muted/50 border border-border italic text-xl text-center">
              "{content.detailedContent}"
            </div>
            <h2 className="text-3xl font-bold mb-6">Why it matters</h2>
            <p className="text-lg text-muted-foreground leading-loose mb-8">
              In today's digital landscape, the difference between a successful conversion and a missed opportunity often comes down to the user experience of your forms. By leveraging {content.title}, you're not just collecting information; you're building a relationship with your users through a seamless, professional, and intelligent interface.
            </p>
          </div>

          <div className="p-12 rounded-3xl bg-primary text-primary-foreground text-center space-y-6">
             <h3 className="text-3xl font-bold">Ready to use {content.title}?</h3>
             <p className="text-xl opacity-90 max-w-xl mx-auto">
                Join the modern organizations using FormTo.Link to power their data collection and workflows.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="px-8 font-bold text-primary">Get Started Now</Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="px-8 border-white/20 hover:bg-white/10 text-white">Contact Sales</Button>
                </Link>
             </div>
          </div>

          <div className="pt-12 flex items-center justify-between border-t border-border">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Explore More</p>
                <Link href="/resources" className="text-xl font-bold hover:text-primary transition-colors flex items-center gap-2">
                   Browse all resources
                   <ArrowRight className="h-5 w-5" />
                </Link>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

