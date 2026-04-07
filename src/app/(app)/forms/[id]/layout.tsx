"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart, Settings, SquarePen } from "lucide-react";
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
    {
      name: "Builder",
      href: `/forms/${formId}/edit`,
      icon: SquarePen,
    },
    {
      name: "Analytics",
      href: `/forms/${formId}/analytics`,
      icon: BarChart,
    },
    {
      name: "Settings",
      href: `/forms/${formId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card">
        <div className="flex items-center h-14 px-4 gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-2">
             <Link href="/forms">
               <ArrowLeft className="h-4 w-4" />
             </Link>
          </Button>
          <div className="h-4 w-px bg-border max-sm:hidden"></div>
          <span className="font-medium text-sm truncate max-w-[200px] shrink-0 max-sm:hidden">
            Customer Feedback 2024
          </span>

          <nav className="flex items-center space-x-1 ml-auto sm:ml-4">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`flex items-center px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>

          <Button variant="outline" size="sm" asChild className="ml-2 hidden sm:flex">
             <Link href={`/preview/${formId}`} target="_blank">
               Preview
             </Link>
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-muted/20">
        {children}
      </div>
    </div>
  );
}
