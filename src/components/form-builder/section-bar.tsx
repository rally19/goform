"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { BuilderSection } from "@/lib/form-types";
import {
  Settings2,
  Copy,
  Trash2,
  PlusCircle,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

interface SectionBarProps {
  sections: BuilderSection[];
  currentSection: BuilderSection;
  currentIndex: number;
  onSelectSection: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddAfter: (afterIndex: number) => void;
  accentColor: string;
}

export function SectionBar({
  sections,
  currentSection,
  currentIndex,
  onSelectSection,
  onOpenSettings,
  onDuplicate,
  onDelete,
  onAddAfter,
  accentColor,
}: SectionBarProps) {
  const total = sections.length;
  const isOnly = total === 1;

  const goFirst = () => onSelectSection(sections[0].id);
  const goPrev = () => currentIndex > 0 && onSelectSection(sections[currentIndex - 1].id);
  const goNext = () => currentIndex < total - 1 && onSelectSection(sections[currentIndex + 1].id);
  const goLast = () => onSelectSection(sections[total - 1].id);

  const MAX_VISIBLE = 5;
  let pageStart = Math.max(0, currentIndex - Math.floor(MAX_VISIBLE / 2));
  const pageEnd = Math.min(total, pageStart + MAX_VISIBLE);
  if (pageEnd - pageStart < MAX_VISIBLE) {
    pageStart = Math.max(0, pageEnd - MAX_VISIBLE);
  }
  const visiblePages = sections.slice(pageStart, pageEnd);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex flex-col gap-1.5 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action row */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm shadow-sm">
          {/* Left: section name + settings */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[180px]"
              style={{ color: accentColor }}
            >
              {currentSection.name}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => onOpenSettings(currentSection.id)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Section settings</TooltipContent>
            </Tooltip>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDuplicate(currentSection.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Duplicate section</TooltipContent>
            </Tooltip>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:text-destructive"
                      disabled={isOnly}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isOnly ? "Cannot delete the only section" : "Delete section"}
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Section?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{currentSection.name}&rdquo; and all its fields. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(currentSection.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="w-px h-4 bg-border mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddAfter(currentIndex)}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Add section after</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Pagination row */}
        <div className="flex items-center justify-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={currentIndex === 0}
            onClick={goFirst}
          >
            <ChevronsLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={currentIndex === 0}
            onClick={goPrev}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>

          {pageStart > 0 && (
            <span className="text-[10px] text-muted-foreground px-1">…</span>
          )}

          {visiblePages.map((sec, vi) => {
            const absIdx = pageStart + vi;
            const isCurrent = sec.id === currentSection.id;
            return (
              <button
                key={sec.id}
                onClick={() => onSelectSection(sec.id)}
                className={cn(
                  "h-6 min-w-[24px] px-1.5 rounded text-[11px] font-medium transition-colors",
                  isCurrent
                    ? "text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                style={isCurrent ? { backgroundColor: accentColor } : undefined}
              >
                {absIdx + 1}
              </button>
            );
          })}

          {pageEnd < total && (
            <span className="text-[10px] text-muted-foreground px-1">…</span>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={currentIndex === total - 1}
            onClick={goNext}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={currentIndex === total - 1}
            onClick={goLast}
          >
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
