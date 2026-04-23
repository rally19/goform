"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, HelpCircle, Book, MessageSquare, Zap, Shield, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SUPPORT_CATEGORIES = [
  { title: "Getting Started", icon: Zap, desc: "New to FormTo.Link? Start here to build your first form." },
  { title: "Account & Billing", icon: Shield, desc: "Manage your subscription, invoices, and account settings." },
  { title: "Forms & Logic", icon: HelpCircle, desc: "Learn about field types, conditional logic, and formulas." },
  { title: "Teams & Organizations", icon: Users, desc: "Collaborate with your team and manage organization permissions." },
  { title: "API & Integrations", icon: Book, desc: "Technical guides for developers and connecting other tools." },
  { title: "Security & Privacy", icon: Shield, desc: "How we protect your data and stay compliant." },
];

export default function SupportPageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] -z-10" />
        <div className="container px-4 md:px-6 flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-8"
          >
            How can we <span className="text-primary-foreground/80">help you?</span>
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative w-full max-w-2xl group"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
            <Input 
              placeholder="Search for articles, guides, and more..." 
              className="pl-14 h-16 text-lg rounded-2xl border-none bg-white text-slate-900 shadow-2xl focus-visible:ring-white/20"
            />
          </motion.div>
        </div>
      </section>

      <section className="py-24 container px-4 md:px-6">
        <h2 className="text-2xl font-bold mb-12 text-center">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {SUPPORT_CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-8 rounded-[2rem] border border-border bg-card hover:bg-accent/5 transition-all cursor-pointer group"
            >
              <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-6 text-primary group-hover:scale-110 transition-transform">
                <cat.icon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">{cat.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {cat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-muted/30 border-t border-border">
         <div className="container px-4 md:px-6 text-center space-y-8">
            <h2 className="text-3xl font-bold">Still need help?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
               If you couldn't find what you were looking for, our support team is just a message away.
            </p>
            <div className="flex gap-4 justify-center">
               <Button size="lg" className="h-14 px-10 text-lg font-bold">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Live Chat
               </Button>
               <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold">
                  Email Support
               </Button>
            </div>
         </div>
      </section>
    </div>
  );
}
