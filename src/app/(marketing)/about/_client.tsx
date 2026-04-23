"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Heart, Sparkles, Target, Zap, Shield, Users } from "lucide-react";

const VALUES = [
  { title: "Simplicity First", icon: Sparkles, desc: "We believe that complexity is the enemy of productivity. Everything we build is designed to be intuitive." },
  { title: "Privacy by Design", icon: Shield, desc: "Your data is yours. We build tools that prioritize security and user privacy at every layer." },
  { title: "User-Centric", icon: Heart, desc: "We listen to our users and build features that solve real problems for real people." },
  { title: "Continuous Innovation", icon: Zap, desc: "The web is always evolving, and so are we. We're constantly pushing the boundaries of form technology." },
];

export default function AboutPageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="py-24 md:py-40 container px-4 md:px-6">
        <div className="max-w-4xl mx-auto space-y-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold"
          >
            <Target className="h-4 w-4" />
            Our Mission
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight"
          >
            We're on a mission to make data collection <span className="text-primary italic">enjoyable.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-xl md:text-2xl leading-relaxed"
          >
            Founded in 2024, FormTo.Link was born out of frustration with clunky, slow, and uninspiring form builders. We believe that the interaction between a brand and its audience should be beautiful and frictionless.
          </motion.p>
        </div>
      </section>

      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center mb-20">
             <h2 className="text-3xl md:text-5xl font-bold mb-6">Values that drive us</h2>
             <p className="text-muted-foreground text-lg max-w-2xl">
               These core principles guide everything we do, from the features we build to the way we support our customers.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
             {VALUES.map((value, i) => (
               <motion.div
                 key={value.title}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: i * 0.1 }}
                 className="p-10 rounded-[3rem] border border-border bg-card group hover:border-primary/40 transition-all"
               >
                  <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-8 text-primary group-hover:scale-110 transition-transform">
                     <value.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{value.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                     {value.desc}
                  </p>
               </motion.div>
             ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-40 container px-4 md:px-6">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center max-w-6xl mx-auto">
            <div className="relative">
               <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full" />
               <div className="relative aspect-square rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white/[0.05]" />
                  <Users className="h-40 w-40 text-primary opacity-20" />
               </div>
            </div>
            <div className="space-y-8">
               <h2 className="text-3xl md:text-5xl font-bold">A team of makers</h2>
               <p className="text-muted-foreground text-xl leading-relaxed">
                  We're a distributed team of designers, engineers, and marketers who are passionate about building great software. We're focused on long-term sustainability and delivering value to our users.
               </p>
               <p className="text-muted-foreground text-xl leading-relaxed">
                  Every member of our team is an owner. We take pride in our craft and we're committed to providing the best possible experience for our users.
               </p>
            </div>
         </div>
      </section>
    </div>
  );
}
