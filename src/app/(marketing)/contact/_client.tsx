"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";

export default function ContactPageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="py-24 md:py-40 bg-muted/30 border-b border-border flex-1 flex flex-col items-center justify-center">
        <div className="container px-4 md:px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-primary/10 rounded-2xl text-primary mb-8"
          >
            <Mail className="h-10 w-10" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
          >
            Get in <span className="text-primary">touch</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-xl md:text-2xl max-w-[600px] mb-12 leading-relaxed"
          >
            Our team is here to help. Reach out to us via email and we'll get back to you as soon as possible.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row gap-6"
          >
             <div className="p-10 rounded-[2.5rem] border border-border bg-card shadow-2xl min-w-[320px] group hover:border-primary/40 transition-colors">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Support</h3>
                <a href="mailto:support@formto.link" className="text-2xl md:text-3xl font-bold hover:text-primary transition-colors">
                  support@formto.link
                </a>
             </div>
             <div className="p-10 rounded-[2.5rem] border border-border bg-card shadow-2xl min-w-[320px] group hover:border-primary/40 transition-colors">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Sales</h3>
                <a href="mailto:sales@formto.link" className="text-2xl md:text-3xl font-bold hover:text-primary transition-colors">
                  sales@formto.link
                </a>
             </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
