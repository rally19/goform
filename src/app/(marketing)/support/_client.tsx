"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, HelpCircle, Book, MessageSquare, Zap, Shield, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SUPPORT_CATEGORIES = [
  { title: "Getting Started", icon: Zap, desc: "New to FormTo.Link? Start here to build your first form with 24+ field types.", href: "/resources/form-builder" },
  { title: "Account & Billing", icon: Shield, desc: "Manage your subscription, workspace plan limits, and account settings.", href: "/pricing" },
  { title: "Forms & Logic", icon: HelpCircle, desc: "Learn about field types, validation rules, conditional logic, and field requirement rules.", href: "/resources/logic-branching" },
  { title: "Teams & Organizations", icon: Users, desc: "Collaborate with your team, manage organization workspaces, and assign role permissions.", href: "/resources/collaboration" },
  { title: "API & Developer Tools", icon: Book, desc: "Technical guides for managing API keys and programmatic form management.", href: "/resources/api-reference" },
  { title: "Security & Privacy", icon: Shield, desc: "How we protect your data with Supabase authentication and row-level security policies.", href: "/resources/security" },
];

export default function SupportPageClient() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredCategories = SUPPORT_CATEGORIES.filter(
    (cat) =>
      cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-16 text-lg rounded-2xl border-none bg-white text-slate-900 shadow-2xl focus-visible:ring-white/20"
            />
          </motion.div>
        </div>
      </section>

      <section className="py-24 container px-4 md:px-6">
        <h2 className="text-2xl font-bold mb-12 text-center">Browse by Category</h2>
        
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-3xl max-w-6xl mx-auto">
            <p className="text-muted-foreground text-lg mb-4">No categories or articles found matching "{searchQuery}"</p>
            <Button onClick={() => setSearchQuery("")} variant="outline" className="rounded-xl">
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {filteredCategories.map((cat, i) => (
              <Link href={cat.href} key={cat.title}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-8 rounded-[2rem] border border-border bg-card hover:bg-accent/5 transition-all cursor-pointer h-full group"
                >
                  <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-6 text-primary group-hover:scale-110 transition-transform">
                    <cat.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{cat.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {cat.desc}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="py-24 bg-muted/30 border-t border-border">
         <div className="container px-4 md:px-6 text-center space-y-8">
            <h2 className="text-3xl font-bold">Still need help?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
               If you couldn't find what you were looking for, our support team is just a message away.
            </p>
            <div className="flex gap-4 justify-center">
               <Link href="/contact">
                  <Button size="lg" className="h-14 px-10 text-lg font-bold">
                     <MessageSquare className="mr-2 h-5 w-5" />
                     Contact Us
                  </Button>
               </Link>
               <Link href="/resources">
                  <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold">
                     Browse Guides
                  </Button>
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
}
