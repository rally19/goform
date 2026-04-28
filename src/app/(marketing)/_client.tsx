"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Layout, Sparkles, Zap, Shield, BarChart3, Globe, Users } from "lucide-react";

export default function LandingPageClient() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-52 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
        </div>

        <div className="container px-4 md:px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 border border-primary/20"
          >
            <Zap className="h-3 w-3" />
            <span>Built for high-performance teams</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter max-w-4xl mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
          >
            Go from a simple form to a <span className="text-primary italic">powerful link</span> in minutes.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-[700px] mb-10"
          >
            FormTo.Link is the most intuitive form builder for modern teams. Build, share, and collaborate on data collection with ease.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                Get Started for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/solutions">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-12 border-border/60 hover:bg-accent/50 backdrop-blur-sm">
                View Solutions
              </Button>
            </Link>
          </motion.div>

          {/* Hero Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 md:mt-24 w-full max-w-5xl relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-indigo-500/30 rounded-2xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative rounded-2xl border border-border/50 bg-background shadow-2xl overflow-hidden aspect-[16/10] md:aspect-[16/9]">
              {/* Mockup UI */}
              <div className="absolute top-0 w-full h-8 border-b border-border/50 bg-muted/50 flex items-center px-4 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
              </div>
              <div className="pt-8 w-full h-full flex items-center justify-center bg-grid-slate-100/[0.03] relative">
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="relative z-10 w-full max-w-lg p-6 space-y-6">
                   <div className="space-y-2">
                     <div className="h-4 w-24 bg-primary/20 rounded animate-pulse" />
                     <div className="h-8 w-full bg-muted rounded" />
                   </div>
                   <div className="space-y-2">
                     <div className="h-4 w-32 bg-muted rounded" />
                     <div className="h-24 w-full bg-muted rounded" />
                   </div>
                   <div className="h-10 w-32 bg-primary rounded" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* Features Grid */}
      <section id="features" className="py-24 md:py-32 bg-background relative">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to <span className="text-primary">grow</span>.</h2>
            <p className="text-muted-foreground text-lg max-w-[600px]">
              We've obsessed over every detail so you don't have to. Experience a form builder that's actually enjoyable to use.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Drag & Drop Builder",
                description: "Over 20+ field types including file uploads, ratings, and multi-select. Build complex forms in seconds.",
                icon: Layout,
              },
              {
                title: "Real-time Collaboration",
                description: "Work together with your team in real-time. See cursor presence and edits as they happen.",
                icon: Users,
              },
              {
                title: "Smart Logic",
                description: "Conditional branching that makes your forms feel personalized by showing only relevant questions.",
                icon: Zap,
              },
              {
                title: "Advanced Analytics",
                description: "Understand your audience with daily submission trends and deep field-level breakdown statistics.",
                icon: BarChart3,
              },
              {
                title: "Multi-tenancy",
                description: "Organize your forms into workspaces and organizations. Manage permissions for every team member.",
                icon: Globe,
              },
              {
                title: "Asset Management",
                description: "A centralized hub for all your form assets. Manage images, videos, and documents effortlessly.",
                icon: Sparkles,
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group p-8 rounded-2xl border border-border/50 bg-card hover:bg-accent/5 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits / Stats Section */}
      <section className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[100%] bg-white/5 skew-x-[-20deg] translate-x-[20%]" />
        <div className="container px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Stop losing leads to <br className="hidden md:block" /> ugly, slow forms.</h2>
              <div className="space-y-4">
                {[
                  "Optimized for high completion rates",
                  "Average completion time tracking",
                  "100% responsive on all mobile devices",
                  "Export responses to CSV, XLSX, or PDF anytime"
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground/80" />
                    <span className="text-lg opacity-90">{benefit}</span>
                  </div>
                ))}
              </div>
              <Link href="/login">
                <Button size="lg" variant="secondary" className="text-primary font-bold px-8 h-12">
                  Start Building Now
                </Button>
              </Link>
            </div>
            <div className="flex flex-col justify-center space-y-6">
              <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                <p className="text-2xl font-bold mb-2">Built for Developers</p>
                <p className="text-primary-foreground/70 leading-relaxed">
                  Every part of FormTo.Link is built with developers in mind. Use our API to integrate form data directly into your workflow.
                </p>
              </div>
              <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                <p className="text-2xl font-bold mb-2">Focus on Experience</p>
                <p className="text-primary-foreground/70 leading-relaxed">
                  We obsess over completion rates. Our forms are designed to be friction-less and delightful for your respondents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container px-4 md:px-6">
          <div className="relative rounded-3xl bg-card border border-border p-12 md:p-24 overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-slate-100/[0.02] -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 blur-[120px] rounded-full -z-10" />
            
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Ready to transform your data collection?</h2>
            <p className="text-muted-foreground text-lg max-w-[600px] mb-10 leading-relaxed">
              Join forward-thinking teams who use FormTo.Link to build better relationships with their customers through better forms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12 shadow-xl shadow-primary/20">
                  Start Building for Free
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="ghost" className="w-full sm:w-auto text-base px-8 h-12">
                  View Pricing Plans
                </Button>
              </Link>
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              Get started in seconds. No credit card required.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
