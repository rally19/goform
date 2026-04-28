"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lightbulb, Rocket, Users, Target, Zap, Shield, Sparkles, ArrowRight, BarChart3, Puzzle, Layout, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SOLUTIONS = [
  {
    id: "lead-generation",
    title: "Lead Generation",
    description: "Convert visitors into customers with high-performance forms designed for speed and completion.",
    icon: Target,
    color: "bg-blue-500",
    features: ["Conditional Logic", "Email Notifications", "Custom Redirects"]
  },
  {
    id: "customer-feedback",
    title: "Customer Feedback",
    description: "Listen to your users and gather actionable insights with NPS, CSAT, and open-ended surveys.",
    icon: MessageSquare,
    color: "bg-emerald-500",
    features: ["Anonymous Submissions", "Submission Limits", "Export to PDF/XLSX"]
  },
  {
    id: "internal-workflows",
    title: "Internal Workflows",
    description: "Streamline operations with internal request forms, approval flows, and automated notifications.",
    icon: Zap,
    color: "bg-amber-500",
    features: ["Multi-page Logic", "File Uploads", "5 Team Roles"]
  },
  {
    id: "event-registration",
    title: "Event Registration",
    description: "Manage event sign-ups, ticket types, and attendee data with ease and security.",
    icon: Users,
    color: "bg-purple-500",
    features: ["Capacity Limits", "QR Code Sharing", "CSV/XLSX Export"]
  }
];

const INNOVATIONS = [
  {
    title: "Multiplayer Builder",
    description: "The first form builder with real-time multiplayer collaboration. Build together, faster.",
    icon: Users,
  },
  {
    title: "Formula-based Logic",
    description: "Move beyond simple 'if/then'. Use complex mathematical formulas to create dynamic form experiences.",
    icon: Puzzle,
  },
  {
    title: "Privacy-First Architecture",
    description: "Built on Row-Level Security (RLS) and end-to-end encryption to ensure your data stays yours.",
    icon: Shield,
  }
];

export default function SolutionsPageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Hero */}
      <section className="py-24 md:py-40 bg-muted/30 border-b border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 -skew-x-12 translate-x-1/4" />
        <div className="container px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-8"
          >
            <Lightbulb className="h-4 w-4" />
            Solutions & Innovation
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-4xl"
          >
            Solving data collection <br /> with <span className="text-primary italic">modern innovation.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-xl md:text-2xl max-w-3xl mb-12 leading-relaxed"
          >
            We don't just build forms. We build solutions for the most complex data collection challenges, powered by cutting-edge real-time technology.
          </motion.p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-24 md:py-40 container px-4 md:px-6">
        <div className="flex flex-col items-center text-center mb-20">
           <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for every team</h2>
           <p className="text-muted-foreground text-lg max-w-2xl">
             Explore how FormTo.Link can be tailored to solve specific challenges across your organization.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
           {SOLUTIONS.map((solution, i) => (
             <motion.div
               key={solution.title}
               id={solution.id}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.1 }}
               className="group p-10 rounded-[3rem] border border-border bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-xl scroll-mt-24"
             >
                <div className={`p-5 ${solution.color} rounded-2xl w-fit mb-8 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                   {solution.icon && <solution.icon className="h-8 w-8" />}
                </div>
                <h3 className="text-3xl font-bold mb-4">{solution.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                   {solution.description}
                </p>
                <div className="flex flex-wrap gap-2">
                   {solution.features.map(f => (
                     <span key={f} className="px-3 py-1 rounded-full bg-muted text-xs font-bold text-muted-foreground uppercase tracking-wider">{f}</span>
                   ))}
                </div>
             </motion.div>
           ))}
        </div>
      </section>

      {/* Innovation Section */}
      <section id="innovation" className="py-24 md:py-40 bg-slate-950 text-white relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent)]" />
        <div className="container px-4 md:px-6 relative z-10">
           <div className="flex flex-col lg:flex-row gap-20 items-center">
              <div className="flex-1 space-y-8">
                 <h2 className="text-4xl md:text-6xl font-bold tracking-tight">How we <span className="text-primary italic">innovate.</span></h2>
                 <p className="text-slate-400 text-xl leading-relaxed">
                    Most form builders haven't changed in a decade. We've rebuilt the entire stack to enable experiences that were previously impossible.
                 </p>
                 <div className="space-y-12 pt-8">
                    {INNOVATIONS.map((inn, i) => (
                      <div key={inn.title} className="flex gap-6">
                         <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shrink-0">
                            <inn.icon className="h-7 w-7" />
                         </div>
                         <div className="space-y-2">
                            <h3 className="text-2xl font-bold">{inn.title}</h3>
                            <p className="text-slate-500 leading-relaxed text-lg">{inn.description}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="flex-1 w-full max-w-xl">
                 <div className="aspect-square bg-gradient-to-br from-primary/20 to-indigo-500/20 rounded-[4rem] border border-white/10 flex items-center justify-center relative group">
                    <Sparkles className="h-40 w-40 text-primary opacity-20 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-grid-white/[0.05]" />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-40 container px-4 md:px-6 text-center">
         <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to transform your workflow?</h2>
         <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Discover why innovative teams are switching to FormTo.Link for their mission-critical data collection needs.
         </p>
         <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
               <Button size="lg" className="h-14 px-10 text-lg font-bold">Start Building Now</Button>
            </Link>
            <Link href="/contact">
               <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold">Contact Sales</Button>
            </Link>
         </div>
      </section>
    </div>
  );
}

