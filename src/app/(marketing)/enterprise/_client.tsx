"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, Users, Globe2, MessageSquare, Headphones, Lock, CheckCircle2, Server, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

const ENTERPRISE_FEATURES = [
  {
    title: "Secure Infrastructure",
    description: "Robust data protection powered by industry-leading cloud infrastructure and modern encryption.",
    icon: ShieldCheck,
  },
  {
    title: "Advanced Team Roles",
    description: "Granular permissions including owners, managers, and editors to control workspace access.",
    icon: Users,
  },
  {
    title: "Dedicated Organizations",
    description: "Isolate your team's projects into independent workspaces for better data management.",
    icon: Globe2,
  },
  {
    title: "API & Integrations",
    description: "Internal API keys for programmatic access today, with public API docs and webhooks coming in v1.1.",
    icon: Zap,
  },
  {
    title: "Asset Centralization",
    description: "Manage all your organization's files, images, and documents in one secure repository with Supabase Storage.",
    icon: Server,
  },
  {
    title: "Priority Technical Support",
    description: "Direct access to our technical team for help with complex integrations and workflows.",
    icon: Headphones,
  }
];

export default function EnterprisePageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-40 bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent)]" />
        <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-1.5 rounded-full bg-sky-500/10 text-sky-400 text-sm font-bold mb-8 border border-sky-500/20"
          >
            FormTo.Link for Enterprise
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60"
          >
            Scale your data collection <br className="hidden md:block" /> with confidence.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-xl max-w-[800px] mb-12 leading-relaxed"
          >
            Empower your team with a secure, collaborative, and highly customizable form building platform tailored for professional organizations.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
             <Link href="/contact">
                <Button 
                   size="lg" 
                   className="bg-sky-500 hover:bg-sky-400 text-white font-bold h-14 px-10 text-lg"
                >
                   Contact Sales
                </Button>
             </Link>
             <Link href="/resources">
                <Button size="lg" variant="outline" className="border-slate-800 hover:bg-slate-900 text-white font-bold h-14 px-10 text-lg">
                   View Documentation
                </Button>
             </Link>
          </motion.div>
        </div>
      </section>


      {/* Feature Grid */}
      <section className="py-24 md:py-40 container px-4 md:px-6">
         <div className="flex flex-col items-center text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for the modern enterprise</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              From security to scalability, we've built every layer of FormTo.Link to meet the rigorous demands of global organizations.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ENTERPRISE_FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 rounded-3xl border border-border bg-card hover:border-sky-500/30 transition-all group"
              >
                 <div className="p-4 bg-sky-500/10 rounded-2xl w-fit mb-8 text-sky-600 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-8 w-8" />
                 </div>
                 <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                 <p className="text-muted-foreground leading-relaxed text-lg">
                    {feature.description}
                 </p>
              </motion.div>
            ))}
         </div>
      </section>

      {/* In-depth Security Section */}
      <section className="py-24 md:py-40 bg-muted/30 relative overflow-hidden">
         <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
               <div className="space-y-8">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Security isn't a feature. <br /> It's our foundation.</h2>
                  <p className="text-muted-foreground text-xl leading-relaxed">
                     We understand that data integrity and privacy are non-negotiable. That's why we've implemented the most advanced security protocols available today.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {[
                       "End-to-End Encryption",
                       "Row-Level Security (RLS)",
                       "Hashed API Credentials",
                       "JWT-Based Authorization",
                       "Secure Storage Buckets",
                       "99.9% Uptime Guarantee"
                     ].map((item) => (
                       <div key={item} className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-sky-500" />
                          <span className="font-medium">{item}</span>
                       </div>
                     ))}
                  </div>
               </div>
               <div className="relative group">
                  <div className="absolute inset-0 bg-sky-500/20 blur-3xl rounded-full" />
                  <div className="relative bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden aspect-square flex items-center justify-center">
                     <div className="grid grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                           <motion.div
                              key={i}
                              animate={{ 
                                opacity: [0.2, 0.6, 0.2],
                                scale: [1, 1.1, 1]
                              }}
                              transition={{ 
                                duration: 3, 
                                repeat: Infinity, 
                                delay: i * 0.2 
                              }}
                              className="h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center"
                           >
                              <Lock className="h-6 w-6 text-sky-500" />
                           </motion.div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-40 container px-4 md:px-6 text-center">
         <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to scale?</h2>
         <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Join the professional organizations using FormTo.Link to power their mission-critical data collection.
         </p>
         <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
               <Button size="lg" className="h-14 px-10 text-lg font-bold bg-sky-600 hover:bg-sky-500 text-white">Contact Sales</Button>
            </Link>
         </div>
      </section>
    </div>
  );
}
