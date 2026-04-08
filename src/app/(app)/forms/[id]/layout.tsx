"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart2, Settings, SquarePen, ClipboardList, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FormLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const pathname = usePathname();
  const { id: formId } = use(params);

  const tabs = [
    { name: "Builder", href: `/forms/${formId}/edit`, icon: SquarePen },
    { name: "Results", href: `/forms/${formId}/results`, icon: ClipboardList },
    { name: "Analytics", href: `/forms/${formId}/analytics`, icon: BarChart2 },
    { name: "Settings", href: `/forms/${formId}/settings`, icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card">
        <div className="flex items-center h-12 px-4 gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0 h-8 w-8 -ml-1">
            <Link href="/forms">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-4 w-px bg-border shrink-0" />

          <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive =
                tab.href === `/forms/${formId}/edit`
                  ? pathname.endsWith("/edit")
                  : pathname.includes(tab.href.split("/").pop()!);
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded-md whitespace-nowrap ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>

          <Button variant="outline" size="sm" asChild className="shrink-0 h-8 hidden sm:flex">
            <Link href={`/preview/${formId}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
