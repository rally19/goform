"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SECTION_TYPE_META, type SectionType } from "@/lib/form-types";
import { cn } from "@/lib/utils";
import { ChevronRight, Send, Trophy } from "lucide-react";

const TYPE_ICONS: Record<SectionType, React.ElementType> = {
  next: ChevronRight,
  submit: Send,
  success: Trophy,
};

const TYPE_COLORS: Record<SectionType, string> = {
  next: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  submit: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  success: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

interface SectionTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: SectionType) => void;
}

export function SectionTypeDialog({ open, onOpenChange, onSelect }: SectionTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Section</DialogTitle>
          <DialogDescription>Choose the type of section to add</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 pt-2">
          {SECTION_TYPE_META.map((meta) => {
            const Icon = TYPE_ICONS[meta.type];
            return (
              <button
                key={meta.type}
                type="button"
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                onClick={() => {
                  onSelect(meta.type);
                  onOpenChange(false);
                }}
              >
                <div className={cn("flex items-center justify-center h-9 w-9 rounded-md border shrink-0", TYPE_COLORS[meta.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{meta.label}</div>
                  <div className="text-xs text-muted-foreground">{meta.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
