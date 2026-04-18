"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GripVertical, MoveRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderSection } from "@/lib/form-types";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SectionReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: BuilderSection[];
  currentSectionId: string | null;
  accentColor: string;
  others?: readonly any[];
  onReorder: (id: string, toIndex: number) => void;
}

interface SortableRowProps {
  section: BuilderSection;
  index: number;
  total: number;
  isCurrent: boolean;
  accentColor: string;
  viewers: { connectionId: number; info: { name: string; avatar: string; color: string } }[];
}

function SortableRow({ section, index, total, isCurrent, accentColor, viewers }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card transition-shadow select-none",
        isDragging && "z-50 cursor-grabbing",
      )}
      style={{
        ...style,
        borderColor: isDragging ? accentColor : isCurrent ? accentColor : undefined,
        boxShadow: isDragging
          ? `0 8px 24px -4px rgba(0,0,0,0.18), 0 0 0 2px ${accentColor}40`
          : isCurrent
          ? `0 0 0 2px ${accentColor}30`
          : undefined,
        opacity: isDragging ? 0.95 : 1,
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="p-1 -m-1 touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Index badge */}
      <span
        className="h-5 min-w-[20px] px-1.5 rounded text-[11px] font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
      >
        {index + 1}
      </span>

      {/* Name */}
      <span className="flex-1 text-sm font-medium truncate">{section.name}</span>

      {/* Live presence avatars */}
      {viewers.length > 0 && (
        <TooltipProvider delayDuration={0}>
          <div className="flex -space-x-1.5">
            {viewers.map((v) => (
              <Tooltip key={v.connectionId}>
                <TooltipTrigger asChild>
                  <Avatar
                    className="h-5 w-5 border-2 border-background shadow-sm"
                    style={{ borderColor: v.info.color }}
                  >
                    <AvatarImage src={v.info.avatar || undefined} />
                    <AvatarFallback
                      className="text-[7px] font-bold text-white"
                      style={{ backgroundColor: v.info.color }}
                    >
                      {v.info.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-[11px] py-1 px-2">
                  {v.info.name}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

export function SectionReorderDialog({
  open,
  onOpenChange,
  sections,
  currentSectionId,
  accentColor,
  others = [],
  onReorder,
}: SectionReorderDialogProps) {
  const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIdx = sorted.findIndex((s) => s.id === active.id);
    const toIdx = sorted.findIndex((s) => s.id === over.id);
    if (fromIdx !== -1 && toIdx !== -1) {
      onReorder(String(active.id), toIdx);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-4" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveRight className="h-4 w-4" />
            Reorder Sections
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Drag the rows to change the section order. Changes apply in real-time.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {sorted.map((section, idx) => {
                const viewers = others
                  .filter((o) => o.presence?.selectedSectionId === section.id && o.info)
                  .map((o) => ({ connectionId: o.connectionId, info: o.info }));
                return (
                  <SortableRow
                    key={section.id}
                    section={section}
                    index={idx}
                    total={sorted.length}
                    isCurrent={section.id === currentSectionId}
                    accentColor={accentColor}
                    viewers={viewers}
                  />
                );
              })}
            </div>
          </SortableContext>

        </DndContext>
      </DialogContent>
    </Dialog>
  );
}
