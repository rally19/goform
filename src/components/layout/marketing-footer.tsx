"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Users, SquarePen } from "lucide-react";
import * as icons from "simple-icons";

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

export function MarketingFooter() {
  const [year, setYear] = React.useState<number | null>(null);

  React.useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full border-t border-border bg-background py-12 md:py-16 lg:py-20">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
                <SquarePen className="size-4" />
              </div>
              <span className="text-xl font-bold tracking-tight">FormTo<span className="text-primary">.Link</span></span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Build beautiful, conversion-optimized forms in minutes. The easiest way to collect data and connect with your audience.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <SimpleIcon icon={icons.siX} className="h-5 w-5" />
                <span className="sr-only">X (Twitter)</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <SimpleIcon icon={icons.siGithub} className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Users className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground uppercase tracking-wider">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/solutions" className="text-sm text-muted-foreground hover:text-primary transition-colors">Solutions</Link></li>
              <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors">Resources</Link></li>
              <li><Link href="/enterprise" className="text-sm text-muted-foreground hover:text-primary transition-colors">Enterprise</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground uppercase tracking-wider">Support</h3>
            <ul className="space-y-2">
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">Support Center</Link></li>
              <li><Link href="/community" className="text-sm text-muted-foreground hover:text-primary transition-colors">Community</Link></li>
              <li><Link href="/resources/security" className="text-sm text-muted-foreground hover:text-primary transition-colors">Security</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground uppercase tracking-wider">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About</Link></li>
              <li><Link href="/careers" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © {year || 2026} FormTo.Link. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> for the web.
          </p>
        </div>
      </div>
    </footer>
  );
}
