"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { motion, AnimatePresence } from "motion/react";
import type { BuilderSection } from "@/lib/form-types";
import {
  Settings2,
  Copy,
  Trash2,
  PlusCircle,
  MoveRight,
} from "lucide-react";
import { useState } from "react";
import { SectionReorderDialog } from "./section-reorder-dialog";

import { sanitize } from "@/lib/sanitize";

interface SectionEditorInfo {
  connectionId: number;
  info: { name: string; avatar: string; color: string };
}

interface SectionBarProps {
  sections: BuilderSection[];
  currentSection: BuilderSection;
  currentIndex: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onReorder: (id: string, toIndex: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddAfter: (afterIndex: number) => void;
  accentColor: string;
  others?: readonly any[];
  currentSectionId?: string | null;
}

export function SectionBar({
  sections,
  currentSection,
  currentIndex,
  isSelected,
  onSelect,
  onOpenSettings,
  onReorder,
  onDuplicate,
  onDelete,
  onAddAfter,
  accentColor,
  others = [],
  currentSectionId,
}: SectionBarProps) {
  const total = sections.length;
  const isOnly = total === 1;
  const [reorderOpen, setReorderOpen] = useState(false);

  // Presence: others viewing this section's settings
  const editors: SectionEditorInfo[] = others
    .filter((o) => o.presence?.selectedSectionId === currentSection.id && o.info)
    .map((o) => ({ connectionId: o.connectionId, info: o.info }));
  const isBeingEditedByOther = editors.length > 0;
  const primaryEditorColor = editors[0]?.info?.color;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex flex-col gap-1.5 select-none relative"
      >
        {/* Presence badge — mirrors FieldCard "X is editing" label */}
        <AnimatePresence>
          {isBeingEditedByOther && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute -top-7 left-4 px-2 py-1 rounded-t-lg text-[10px] font-bold text-white shadow-md flex items-center gap-2 z-10"
              style={{ backgroundColor: primaryEditorColor }}
            >
              <TooltipProvider delayDuration={0}>
                <div className="flex -space-x-1.5">
                  {editors.map((ed) => (
                    <Tooltip key={ed.connectionId}>
                      <TooltipTrigger asChild>
                        <div>
                          <Avatar className="h-5 w-5 border-2 border-white/20 ring-offset-background shadow-sm bg-background/20 backdrop-blur-sm">
                            <AvatarImage src={ed.info.avatar || undefined} />
                            <AvatarFallback className="bg-transparent text-[7px] text-white">
                              {ed.info.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[11px] py-1 px-2 font-medium">
                        {ed.info.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
              <div className="h-1 w-1 rounded-full bg-white animate-pulse" />
              <span className="max-w-[140px] truncate">
                {editors.length === 1
                  ? `${editors[0].info.name} is editing`
                  : `${editors.length} people editing`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action row — clicking the card body toggles section selection */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 px-3 py-2 rounded-xl border bg-card transition-all duration-300 cursor-pointer",
            !isSelected && !isBeingEditedByOther && "border-border",
            isBeingEditedByOther && "ring-2 ring-offset-2"
          )}
          onClick={(e) => { e.stopPropagation(); onSelect(currentSection.id); }}
          style={{
            borderColor: isSelected
              ? accentColor
              : isBeingEditedByOther
              ? primaryEditorColor
              : undefined,
            boxShadow: isSelected
              ? `0 0 0 4px ${accentColor}10, 0 4px 20px -4px ${accentColor}25`
              : undefined,
            backgroundColor: isSelected ? `${accentColor}05` : undefined,
            ...(isBeingEditedByOther ? { ringColor: primaryEditorColor } : {}),
          }}
        >
          {/* Left: section name + settings */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="text-xs font-semibold prose-sm max-w-full"
              style={{ color: accentColor }}
              dangerouslySetInnerHTML={{ __html: sanitize(currentSection.name) }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => { e.stopPropagation(); onOpenSettings(currentSection.id); }}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Section settings</TooltipContent>
            </Tooltip>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Reorder dialog trigger */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={isOnly}
                  onClick={() => setReorderOpen(true)}
                >
                  <MoveRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Reorder sections</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-0.5" />

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
                  <div className="text-sm text-muted-foreground">
                    This will permanently delete <strong dangerouslySetInnerHTML={{ __html: sanitize(currentSection.name) }} /> and all its fields. This cannot be undone.
                  </div>
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

      </div>

      <SectionReorderDialog
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        sections={sections}
        currentSectionId={currentSectionId ?? currentSection.id}
        accentColor={accentColor}
        others={others}
        onReorder={onReorder}
      />
    </TooltipProvider>
  );
}
