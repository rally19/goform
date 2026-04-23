"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X, Rocket, Shield, BarChart3, Puzzle, Layout, Lock, SquarePen, MessageSquare, Headphones, Users, Info, Briefcase, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  {
    title: "Solutions",
    href: "/solutions",
    dropdown: [
      {
        title: "Lead Generation",
        description: "Convert visitors into customers with high-performance forms.",
        icon: Target,
        href: "/solutions#lead-generation",
      },
      {
        title: "Customer Feedback",
        description: "Deep insights into your form performance and conversions.",
        icon: BarChart3,
        href: "/solutions#customer-feedback",
      },
      {
        title: "Internal Workflows",
        description: "Streamline operations with automated notifications.",
        icon: Zap,
        href: "/solutions#internal-workflows",
      },
      {
        title: "Event Registration",
        description: "Manage sign-ups and attendee data with ease.",
        icon: Users,
        href: "/solutions#event-registration",
      },
    ],
  },
  {
    title: "Resources",
    href: "/resources",
    dropdown: [
      {
        title: "Documentation",
        description: "Everything you need to know about FormTo.Link.",
        icon: Rocket,
        href: "/resources",
      },
      {
        title: "Enterprise Guide",
        description: "Scalability and security for large organizations.",
        icon: Shield,
        href: "/enterprise",
      },
      {
        title: "Security",
        description: "How we protect your data and privacy.",
        icon: Lock,
        href: "/resources/security",
      },
    ],
  },
  {
    title: "Support",
    href: "#",
    dropdown: [
      {
        title: "Contact",
        description: "Get in touch with our team for help or sales inquiries.",
        icon: MessageSquare,
        href: "/contact",
      },
      {
        title: "Support Center",
        description: "Help articles and guides for all our features.",
        icon: Headphones,
        href: "/support",
      },
      {
        title: "Community",
        description: "Join our community of builders and share insights.",
        icon: Users,
        href: "/community",
      },
    ],
  },
  {
    title: "Company",
    href: "#",
    dropdown: [
      {
        title: "About",
        description: "Our mission to simplify data collection for everyone.",
        icon: Info,
        href: "/about",
      },
      {
        title: "Careers",
        description: "Join us in building the future of forms.",
        icon: Briefcase,
        href: "/careers",
      },
    ],
  },
  { title: "Pricing", href: "/pricing" },
];

export function MarketingNavbar() {
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
              <SquarePen className="size-4" />
            </div>
            <span className="text-xl font-bold tracking-tight">FormTo<span className="text-primary">.Link</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.title}
                className="relative"
                onMouseEnter={() => setHoveredItem(item.title)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                    hoveredItem === item.title ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.title}
                  {item.dropdown && (
                    <ChevronDown className={cn("h-4 w-4 transition-transform", hoveredItem === item.title && "rotate-180")} />
                  )}
                </Link>

                <AnimatePresence>
                  {item.dropdown && hoveredItem === item.title && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-0 top-full pt-2 w-[400px]"
                    >
                      <div className="grid gap-3 p-4 bg-popover rounded-xl border border-border shadow-2xl">
                        {item.dropdown.map((subItem) => (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                          >
                            <div className="mt-1 p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors text-primary">
                              <subItem.icon className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">{subItem.title}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{subItem.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Go to App
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background overflow-y-auto max-h-[calc(100vh-4rem)] shadow-xl"
          >
            <div className="container py-4 space-y-4 px-4">
              {NAV_ITEMS.map((item) => (
                <div key={item.title} className="space-y-2">
                  <Link
                    href={item.href}
                    className="block text-lg font-medium hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                  {item.dropdown && (
                    <div className="pl-4 space-y-2">
                      {item.dropdown.map((subItem) => (
                        <Link
                          key={subItem.title}
                          href={subItem.href}
                          className="block text-sm text-muted-foreground hover:text-primary"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
