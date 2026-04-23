"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layout, BarChart3, Zap, Shield, Sparkles, Rocket, Globe, MousePointer2, Smartphone, Cpu, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Visual Form Builder",
    description: "Build complex multi-page forms without writing code. Use our intuitive editor with 20+ field types to create beautiful interfaces in minutes.",
    icon: Layout,
    color: "text-blue-500",
  },
  {
    title: "Insightful Analytics",
    description: "Watch submissions roll in and see how your forms are performing with daily trends and field-level distribution charts.",
    icon: BarChart3,
    color: "text-emerald-500",
  },
  {
    title: "Smart Logic & Branching",
    description: "Create smart forms that react to user input. Use conditional visibility and mathematical formulas to personalize every experience.",
    icon: Zap,
    color: "text-amber-500",
  },
  {
    title: "Team Collaboration",
    description: "Work together in real-time with cursor presence and synchronized edits. Perfect for modern, distributed teams.",
    icon: Users,
    color: "text-blue-600",
  },
  {
    title: "Organization Management",
    description: "Scale your workflow with multiple organizations and workspaces. Manage team permissions with granular roles.",
    icon: Globe,
    color: "text-purple-500",
  },
  {
    title: "Developer-First API",
    description: "Integrate form data into your own applications. Access your responses programmatically via secure API keys.",
    icon: Cpu,
    color: "text-indigo-500",
  },
];

export default function FeaturesPageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Hero */}
      <section className="py-24 md:py-40 bg-muted/30 border-b border-border overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -z-10" />
        <div className="container px-4 md:px-6 flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
          >
            Powerful features for <br className="hidden md:block" /> <span className="text-primary">every use case.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-xl max-w-[700px] mb-12 leading-relaxed"
          >
            FormTo.Link is more than just a form builder. It's a platform for collecting data, engaging users, and automating your business.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/features">
              <Button size="lg" className="h-14 px-10 text-lg font-bold">
                Explore All Features
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Detailed Features */}
      <section className="py-24 md:py-40 container px-4 md:px-6">
        <div className="space-y-32">
          {FEATURES.map((feature, i) => (
            <div key={feature.title} className={cn(
              "flex flex-col lg:flex-row items-center gap-16 md:gap-24",
              i % 2 === 1 && "lg:flex-row-reverse"
            )}>
              <div className="flex-1 space-y-6">
                <div className={cn("p-4 rounded-2xl w-fit bg-muted", feature.color)}>
                  <feature.icon className="h-10 w-10" />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{feature.title}</h2>
                <p className="text-muted-foreground text-xl leading-relaxed">
                  {feature.description}
                </p>
                <div className="pt-4 space-y-4">
                  {[
                    "Industry leading performance",
                    "Built-in security best practices",
                    "Fully customizable workflows"
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-primary" />
                       <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <Link href={`/resources/${feature.title.toLowerCase().replace(/ /g, "-")}`}>
                   <Button variant="link" className="px-0 text-lg text-primary font-bold mt-4">
                      Learn more about {feature.title} →
                   </Button>
                </Link>
              </div>
              <div className="flex-1 w-full max-w-xl">
                 <motion.div
                   initial={{ opacity: 0, scale: 0.9 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: true }}
                   className="aspect-square bg-muted/50 rounded-[3rem] border border-border flex items-center justify-center relative overflow-hidden group"
                 >
                    <div className="absolute inset-0 bg-grid-slate-100/[0.05] group-hover:scale-110 transition-transform duration-1000" />
                    <feature.icon className={cn("h-40 w-40 opacity-20", feature.color)} />
                    <div className="absolute bottom-8 left-8 right-8 p-6 bg-background/80 backdrop-blur-md rounded-2xl border border-border shadow-lg">
                       <div className="flex items-center gap-4">
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-muted", feature.color)}>
                             <feature.icon className="h-5 w-5" />
                          </div>
                          <div>
                             <p className="font-bold">{feature.title}</p>
                             <p className="text-xs text-muted-foreground">Premium Capability</p>
                          </div>
                       </div>
                    </div>
                 </motion.div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Micro Features */}
      <section className="py-24 md:py-40 bg-muted/30 border-y border-border">
         <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
               {[
                 { title: "Team Collaboration", icon: Users, desc: "Built-in multiplayer experience." },
                 { title: "Responsive Layouts", icon: Smartphone, desc: "Forms that look perfect on any screen." },
                 { title: "High Performance", icon: Cpu, desc: "Optimized for sub-second load times." },
                 { title: "Security First", icon: Shield, desc: "Encrypted data and secure API access." }
               ].map((m) => (
                 <div key={m.title} className="space-y-4">
                    <div className="p-3 bg-background rounded-xl border border-border w-fit text-primary">
                       <m.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">{m.title}</h3>
                    <p className="text-muted-foreground">{m.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-40 container px-4 md:px-6 text-center">
         <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to experience these features?</h2>
         <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Start building for free today and join the modern teams choosing FormTo.Link for their data collection needs.
         </p>
         <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
               <Button size="lg" className="h-14 px-10 text-lg font-bold">Start Building Now</Button>
            </Link>
         </div>
      </section>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
