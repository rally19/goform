"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Users, MessageCircle, Globe, Star, Heart, Lightbulb } from "lucide-react";
import * as icons from "simple-icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function SimpleIcon({ icon, className }: { icon: icons.SimpleIcon; className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={icon.path} />
    </svg>
  );
}

const COMMUNITY_CHANNELS = [
  { 
    title: "Community Forum", 
    icon: (props: any) => <Globe {...props} />, 
    desc: "Join our official forum to ask questions, share your forms, and get feedback from the community.",
    link: "/contact",
    color: "bg-blue-500"
  },
  { 
    title: "Discord Server", 
    icon: (props: any) => <SimpleIcon icon={icons.siDiscord} {...props} />, 
    desc: "Chat in real-time with other FormTo.Link users and our engineering team.",
    link: "/support",
    color: "bg-indigo-500"
  },
  { 
    title: "Twitter / X", 
    icon: (props: any) => <SimpleIcon icon={icons.siX} {...props} />, 
    desc: "Follow us for the latest updates, tips, and feature announcements.",
    link: "/support",
    color: "bg-sky-500"
  },
  { 
    title: "Feedback & Requests", 
    icon: (props: any) => <Lightbulb {...props} />, 
    desc: "Help us shape the future of FormTo.Link by submitting and voting on new features.",
    link: "/contact",
    color: "bg-amber-500"
  },
];

export default function CommunityPageClient() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="py-24 md:py-40 bg-muted/30 border-b border-border overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full -z-10" />
        <div className="container px-4 md:px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-8"
          >
            <Users className="h-4 w-4" />
            Join thousands of creators
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
          >
            Better together. <br className="hidden md:block" /> <span className="text-primary italic">Join our community.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-xl max-w-[700px] mb-12 leading-relaxed"
          >
            Connect with other forward-thinking creators, share your knowledge, and help us shape the future of data collection.
          </motion.p>
        </div>
      </section>

      <section className="py-24 container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {COMMUNITY_CHANNELS.map((channel, i) => (
            <motion.div
              key={channel.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-10 rounded-[3rem] border border-border bg-card hover:border-primary/40 transition-all group flex flex-col md:flex-row gap-8 items-start md:items-center"
            >
              <div className={`p-6 ${channel.color} rounded-3xl text-white shadow-xl group-hover:scale-110 transition-transform shrink-0`}>
                <channel.icon className="h-10 w-10" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">{channel.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {channel.desc}
                </p>
                <Link href={channel.link}>
                  <Button variant="link" className="px-0 text-primary font-bold text-lg">
                     Join Channel →
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-primary text-primary-foreground">
         <div className="container px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-12 max-w-6xl mx-auto">
            <div className="space-y-6 text-center md:text-left">
               <h2 className="text-3xl md:text-5xl font-bold">Community-led growth</h2>
               <p className="text-primary-foreground/80 text-xl max-w-lg leading-relaxed">
                  We believe in building in the open. Our roadmap is public and driven by the feedback of our amazing community members.
               </p>
            </div>
            <div className="flex gap-4">
               <div className="flex flex-col items-center p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20">
                  <Star className="h-10 w-10 mb-4 text-amber-400 fill-amber-400" />
                  <p className="text-4xl font-bold">24+</p>
                  <p className="text-sm opacity-70">Field Types</p>
               </div>
               <div className="flex flex-col items-center p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20">
                  <Heart className="h-10 w-10 mb-4 text-rose-400 fill-rose-400" />
                  <p className="text-4xl font-bold">5</p>
                  <p className="text-sm opacity-70">Team Roles</p>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
