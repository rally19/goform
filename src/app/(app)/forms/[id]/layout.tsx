"use client";

import { use, useRef, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BarChart2, Settings, SquarePen, ClipboardList,
  ExternalLink, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getForm } from "@/lib/actions/forms";

export default function FormLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const pathname = usePathname();
  const { id: formId } = use(params);
  const scrollRef = useRef<HTMLElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [isLoadingForm, setIsLoadingForm] = useState(true);

  const tabs = [
    { name: "Builder", href: `/forms/${formId}/edit`, icon: SquarePen },
    { name: "Results", href: `/forms/${formId}/results`, icon: ClipboardList },
    { name: "Analytics", href: `/forms/${formId}/analytics`, icon: BarChart2 },
    { name: "Settings", href: `/forms/${formId}/settings`, icon: Settings },
  ];

  const updateScrollData = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollData();
    window.addEventListener("resize", updateScrollData);
    return () => window.removeEventListener("resize", updateScrollData);
  }, [updateScrollData]);

  useEffect(() => {
    async function loadForm() {
      try {
        const result = await getForm(formId);
        if (result.success && result.data) {
          setFormTitle(result.data.form.title);
        }
      } catch (err) {
        console.error("Failed to load form title:", err);
      } finally {
        setIsLoadingForm(false);
      }
    }
    loadForm();
  }, [formId]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -150 : 150,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card">
        <div className="flex flex-col">
          <div className="flex items-center h-12 px-2 sm:px-4 gap-2 sm:gap-3 relative">
            <Button variant="ghost" size="icon" asChild className="shrink-0 h-8 w-8">
              <Link href="/forms">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="h-4 w-px bg-border shrink-0" />

            <div className="flex-1 relative flex items-center overflow-hidden h-full">
              {showLeftArrow && (
                <div className="absolute left-0 z-10 h-full flex items-center bg-gradient-to-r from-card to-transparent pr-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-background/80 shadow-sm border border-border"
                    onClick={() => scroll("left")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <nav
                ref={scrollRef}
                onScroll={updateScrollData}
                className="flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar scroll-smooth px-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; }` }} />
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

              {showRightArrow && (
                <div className="absolute right-0 z-10 h-full flex items-center bg-gradient-to-l from-card to-transparent pl-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-background/80 shadow-sm border border-border"
                    onClick={() => scroll("right")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Form title */}
            <div className="flex-1 hidden md:flex items-center justify-center gap-2 px-4 overflow-hidden min-w-0">
              {isLoadingForm ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />
              ) : (
                <span className="text-sm font-semibold text-foreground/80 truncate max-w-[200px] lg:max-w-[400px]">
                  {formTitle}
                </span>
              )}
            </div>

            <Button variant="outline" size="sm" asChild className="shrink-0 h-8 hidden md:flex">
              <Link href={`/preview/${formId}`} target="_blank">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Preview
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
