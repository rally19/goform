"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layout, BarChart3, Puzzle, Shield, Sparkles, Rocket, ArrowRight, Search, BookOpen, Lightbulb, PlayCircle, Cpu, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TOPICS = [
  {
    title: "Interactive Form Builder",
    slug: "form-builder",
    description: "Master the art of building conversion-optimized forms with our drag-and-drop editor.",
    icon: Layout,
    count: 12,
  },
  {
    title: "Advanced Analytics",
    slug: "analytics",
    description: "Learn how to interpret data, track conversions, and improve your form performance.",
    icon: BarChart3,
    count: 8,
  },
  {
    title: "Logic & Branching",
    slug: "logic-branching",
    description: "Build complex, intelligent forms that adapt to your users' specific needs.",
    icon: Puzzle,
    count: 6,
  },
  {
    title: "Security & Compliance",
    slug: "security",
    description: "Deep dive into our encryption, data handling, and GDPR/CCPA compliance.",
    icon: Shield,
    count: 5,
  },
  {
    title: "Design & Customization",
    slug: "branding",
    description: "How to make your forms match your brand perfectly with custom CSS and themes.",
    icon: Sparkles,
    count: 10,
  },
  {
    title: "Integrations",
    slug: "integrations",
    description: "Connect your forms to the tools you use every day, from Slack to Salesforce.",
    icon: Rocket,
    count: 15,
  },
  {
    title: "API & Developer Tools",
    slug: "api-reference",
    description: "Build custom integrations and extend FormTo.Link with our powerful developer tools.",
    icon: Cpu,
    count: 7,
  },
  {
    title: "Workflow Automation",
    slug: "workflow-automation",
    description: "Automate your data collection and connect your forms to the services you use.",
    icon: Zap,
    count: 9,
  },
];

export default function ResourcesPageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Header */}
      <section className="bg-muted/30 border-b border-border py-20">
        <div className="container px-4 md:px-6 flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            Resources & <span className="text-primary">Guides</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-[600px] mb-10"
          >
            Everything you need to build better forms, optimize conversions, and grow your business with FormTo.Link.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative w-full max-w-xl group"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search guides, features, and tutorials..." 
              className="pl-12 h-14 text-lg rounded-2xl border-border/60 bg-background shadow-lg shadow-primary/5 focus-visible:ring-primary/20"
            />
          </motion.div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="py-24 container px-4 md:px-6">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Browse by Topic
          </h2>
          <Link href="/support">
            <Button variant="ghost" className="text-primary hover:text-primary/80">
              View all articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TOPICS.map((topic, i) => (
            <motion.div
              key={topic.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/resources/${topic.slug}`}
                className="group flex flex-col h-full p-8 rounded-3xl border border-border bg-card hover:border-primary/40 hover:shadow-xl transition-all"
              >
                <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-6 text-primary group-hover:scale-110 transition-transform">
                  <topic.icon className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{topic.title}</h3>
                <p className="text-muted-foreground leading-relaxed flex-1 mb-6">
                  {topic.description}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <span className="text-sm font-medium text-muted-foreground">{topic.count} Articles</span>
                  <span className="text-primary font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>


      {/* CTA */}
      <section className="py-24 container px-4 md:px-6 text-center">
         <h2 className="text-3xl font-bold mb-6">Didn't find what you were looking for?</h2>
         <p className="text-muted-foreground text-lg mb-8 max-w-[600px] mx-auto">
           Our support team is available 24/7 to help you with any questions or technical issues you might have.
         </p>
         <div className="flex gap-4 justify-center">
            <Link href="/contact">
               <Button size="lg" className="px-8">Contact Support</Button>
            </Link>
            <Link href="/community">
               <Button size="lg" variant="outline" className="px-8">Join the Community</Button>
            </Link>
         </div>
      </section>
    </div>
  );
}
