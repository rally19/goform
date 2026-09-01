"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Layout, 
  BarChart3, 
  Puzzle, 
  Shield, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Search, 
  BookOpen, 
  Cpu, 
  Users, 
  FileText, 
  Layers, 
  Zap, 
  ChevronRight,
  Terminal,
  HelpCircle,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TopicCategory = "all" | "builder" | "logic" | "dev" | "team";

interface Topic {
  title: string;
  slug: string;
  category: TopicCategory;
  categoryName: string;
  description: string;
  icon: React.ElementType;
  count: number;
  featured?: boolean;
}

const TOPICS: Topic[] = [
  {
    title: "Interactive Form Builder",
    slug: "form-builder",
    category: "builder",
    categoryName: "Form Creation",
    description: "Master drag-and-drop building with 24+ question types, section breaks, and validation rules.",
    icon: Layout,
    count: 12,
    featured: true,
  },
  {
    title: "Logic & Branching Engine",
    slug: "logic-branching",
    category: "logic",
    categoryName: "Logic & Rules",
    description: "Build intelligent forms with 17 operators, visibility rules, field masking, and navigation triggers.",
    icon: Puzzle,
    count: 8,
    featured: true,
  },
  {
    title: "Design & Customization",
    slug: "branding",
    category: "builder",
    categoryName: "Form Creation",
    description: "Customize accent color palettes (#hex), completion messages, progress bars, and redirect URLs.",
    icon: Sparkles,
    count: 10,
  },
  {
    title: "Form Scheduling & Limits",
    slug: "scheduling",
    category: "builder",
    categoryName: "Form Creation",
    description: "Set capacity response limits, decremental counters, start/end schedules, and access toggles.",
    icon: Clock,
    count: 7,
  },
  {
    title: "Analytics & Data Export",
    slug: "analytics",
    category: "builder",
    categoryName: "Insights",
    description: "Analyze response submission trends, average completion times, and export data in CSV/JSON format.",
    icon: BarChart3,
    count: 6,
  },
  {
    title: "Security & Data Isolation",
    slug: "security",
    category: "dev",
    categoryName: "Security & API",
    description: "Learn about Supabase authentication, Row-Level Security (RLS), and isolated cloud storage.",
    icon: Shield,
    count: 5,
  },
  {
    title: "API Keys & Developer Access",
    slug: "api-reference",
    category: "dev",
    categoryName: "Security & API",
    description: "Generate API keys with prefix masking and build custom backend access to forms and responses.",
    icon: Cpu,
    count: 7,
    featured: true,
  },
  {
    title: "Teams & Collaboration",
    slug: "collaboration",
    category: "team",
    categoryName: "Workspaces",
    description: "Collaborate in real time with live cursor presence, shared organization workspaces, and 5 role levels.",
    icon: Users,
    count: 9,
  },
];

const CATEGORY_TABS: { id: TopicCategory; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All Documentation", icon: BookOpen },
  { id: "builder", label: "Form Creation & Styling", icon: Layout },
  { id: "logic", label: "Logic & Rules", icon: Puzzle },
  { id: "dev", label: "Security & API Keys", icon: Cpu },
  { id: "team", label: "Team Workspaces", icon: Users },
];

export default function ResourcesPageClient() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<TopicCategory>("all");

  const filteredTopics = TOPICS.filter((topic) => {
    const matchesSearch =
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "all" || topic.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredTopics = TOPICS.filter((t) => t.featured);

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      {/* ─── Hero Section ────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 border-b border-border/60 overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 -z-10" />
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>FormTo.Link Documentation & Knowledge Hub</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-extrabold tracking-tight"
            >
              How can we help you <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">build today?</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
            >
              Search our comprehensive guides, API references, logic engine docs, and team collaboration playbooks.
            </motion.p>

            {/* Instant Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-2xl pt-4"
            >
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search documentation, API keys, logic operators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-24 h-16 text-lg rounded-2xl border-border bg-card/80 shadow-xl backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground bg-muted border border-border rounded-md">
                      <span>⌘</span> K
                    </kbd>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Main Content Area ───────────────────────────────────────────── */}
      <section className="py-16 md:py-24 container px-4 md:px-6 mx-auto max-w-6xl">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-12 scrollbar-none border-b border-border/40">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Featured Quickstart Guides (Show when on "all" category & no active search) */}
        {!searchQuery && selectedCategory === "all" && (
          <div className="mb-16 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <span>Quickstart & Featured Guides</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <Link href={`/resources/${topic.slug}`} key={topic.slug} className="group">
                    <div className="h-full p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                            {topic.count} Articles
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-primary transition-colors flex items-center gap-1">
                            {topic.title}
                            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                            {topic.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-6 mt-4 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                        <span>Read Documentation</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Documentation Topics Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span>
                {selectedCategory === "all"
                  ? "All Knowledge Categories"
                  : CATEGORY_TABS.find((t) => t.id === selectedCategory)?.label}
              </span>
            </h2>
            <span className="text-sm font-medium text-muted-foreground">
              {filteredTopics.length} {filteredTopics.length === 1 ? "category" : "categories"}
            </span>
          </div>

          {filteredTopics.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-3xl bg-muted/20">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No documentation found</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                We couldn't find any guides matching "{searchQuery}". Try searching for terms like "logic", "API keys", "form builder", or "roles".
              </p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                variant="outline"
                className="rounded-xl"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTopics.map((topic, i) => {
                const Icon = topic.icon;
                return (
                  <motion.div
                    key={topic.slug}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link href={`/resources/${topic.slug}`} className="group block h-full">
                      <div className="p-7 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-xl transition-all h-full flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                              <Icon className="h-7 w-7" />
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                              {topic.categoryName}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors flex items-center justify-between">
                              <span>{topic.title}</span>
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mt-2.5">
                              {topic.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            {topic.count} Articles
                          </span>
                          <span className="text-xs font-bold text-primary flex items-center gap-1 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                            View Docs
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── Documentation Footer Banner ──────────────────────────────────── */}
      <section className="py-16 bg-muted/30 border-t border-border mt-12">
        <div className="container px-4 md:px-6 mx-auto max-w-5xl">
          <div className="p-10 rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-md bg-white/10 text-indigo-300">
                <Terminal className="h-3.5 w-3.5" />
                <span>NEED DIRECT HELP OR CUSTOM API SCOPES?</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold">Can't find what you're looking for?</h3>
              <p className="text-sm text-slate-300 max-w-md">
                Our support engineering team is available to assist you with form logic setup, workspace migration, or API key access.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href="/contact">
                <Button size="lg" className="h-12 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                  Contact Support
                </Button>
              </Link>
              <Link href="/support">
                <Button size="lg" variant="outline" className="h-12 px-6 font-bold border-white/20 text-white hover:bg-white/10 rounded-xl">
                  Support Center
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
