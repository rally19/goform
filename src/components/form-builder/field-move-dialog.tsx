"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoveRight } from "lucide-react";
import type { BuilderSection } from "@/lib/form-types";

interface FieldMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: BuilderSection[];
  currentSectionId: string | null;
  accentColor: string;
  onMove: (targetSectionId: string) => void;
}

export function FieldMoveDialog({
  open,
  onOpenChange,
  sections,
  currentSectionId,
  accentColor,
  onMove,
}: FieldMoveDialogProps) {
  const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const [selected, setSelected] = useState<string | null>(null);

  const handleMove = () => {
    if (!selected) return;
    onMove(selected);
    onOpenChange(false);
    setSelected(null);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setSelected(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm gap-4" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveRight className="h-4 w-4" />
            Move Field to Section
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Select a section to move this field into.
        </p>

        <div className="space-y-1.5">
          {sorted.map((section, idx) => {
            const isCurrent = section.id === currentSectionId;
            const isSelected = selected === section.id;
            return (
              <button
                key={section.id}
                disabled={isCurrent}
                onClick={() => setSelected(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                  isCurrent
                    ? "opacity-40 cursor-not-allowed bg-muted"
                    : isSelected
                    ? "bg-primary/5 border-primary"
                    : "bg-card hover:bg-muted/50 border-border"
                )}
                style={isSelected ? { borderColor: accentColor, backgroundColor: `${accentColor}08` } : undefined}
              >
                <span
                  className="h-5 min-w-[20px] px-1.5 rounded text-[11px] font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{section.name}</span>
                {isCurrent && (
                  <span className="text-[10px] text-muted-foreground shrink-0">current</span>
                )}
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            onClick={handleMove}
            style={selected ? { backgroundColor: accentColor, color: "white" } : undefined}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
