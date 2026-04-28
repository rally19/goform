"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Rocket, Heart, Globe, Zap, Coffee, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const BENEFITS = [
  { title: "Remote First", icon: Globe, desc: "Work from anywhere in the world. We believe in results, not office hours." },
  { title: "Competitive Salary", icon: Zap, desc: "We offer top-tier compensation packages for top-tier talent." },
  { title: "Healthy Work/Life", icon: Heart, desc: "Flexible time off and a culture that respects your personal time." },
  { title: "Growth Budget", icon: Rocket, desc: "A yearly budget for learning, books, and professional development." },
];

export default function CareersPageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="py-24 md:py-40 bg-muted/30 border-b border-border overflow-hidden relative text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -z-10" />
        <div className="container px-4 md:px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
          >
            Help us build the <br className="hidden md:block" /> <span className="text-primary italic">future of forms.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-xl md:text-2xl max-w-[700px] mx-auto mb-12"
          >
            We're a small, ambitious team solving big problems. Join us and make a real impact on how thousands of businesses collect data.
          </motion.p>
        </div>
      </section>

      <section className="py-24 container px-4 md:px-6">
        <div className="flex flex-col items-center text-center mb-20">
           <h2 className="text-3xl md:text-5xl font-bold mb-6">Why join us?</h2>
           <p className="text-muted-foreground text-lg max-w-2xl">
             We're building a company where talented people can do their best work. Here's what we offer our team members.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {BENEFITS.map((benefit, i) => (
             <motion.div
               key={benefit.title}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.1 }}
               className="p-8 rounded-3xl border border-border bg-card hover:border-primary/20 transition-all"
             >
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-6 text-primary">
                   <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">
                   {benefit.desc}
                </p>
             </motion.div>
           ))}
        </div>
      </section>

      <section className="py-24 md:py-32 bg-muted/30 border-y border-border">
         <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto rounded-[3rem] bg-card border border-border p-12 md:p-20 text-center space-y-8">
               <h2 className="text-3xl md:text-5xl font-bold">Open Positions</h2>
               <p className="text-muted-foreground text-xl leading-relaxed">
                  We do not have any open roles at the moment, but we are always interested in meeting talented people. Reach out through our contact page and we will keep you in mind for future openings.
               </p>
               <div className="pt-8">
                  <Link href="/contact">
                    <Button size="lg" className="h-14 px-10 text-lg font-bold">
                       Get in Touch
                    </Button>
                  </Link>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
