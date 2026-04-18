"use client";

import type { BuilderField } from "@/lib/form-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GripVertical, Trash2, Copy, Star, MoveRight,
  Type, AlignLeft, Hash, Mail, Phone, Link2, Calendar, Clock,
  CircleDot, CheckSquare, ChevronDown, ListChecks,
  SlidersHorizontal, Heading, Columns2, Upload, CalendarClock,
} from "lucide-react";
import { FieldMoveDialog } from "./field-move-dialog";
import type { BuilderSection } from "@/lib/form-types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, memo } from "react";

const FIELD_ICONS: Record<string, React.ElementType> = {
  short_text: Type, long_text: AlignLeft, number: Hash, email: Mail,
  phone: Phone, url: Link2, date: Calendar, time: Clock,
  datetime: CalendarClock, select: ChevronDown, multi_select: ListChecks,
  checkbox: CheckSquare, radio: CircleDot, rating: Star,
  scale: SlidersHorizontal, section: Heading, page_break: Columns2,
  file: Upload,
};

interface FieldCardProps {
  field: BuilderField;
  isSelected: boolean;
  accentColor?: string;
  isOverlay?: boolean;
  currentUserId: string;
  sections?: BuilderSection[];
  onUpdate?: (id: string, changes: Partial<BuilderField>) => void;
  onRemove?: (id: string) => void;
  onDuplicate?: (field: BuilderField) => void;
  onMove?: (fieldId: string, targetSectionId: string) => void;
  onClick?: (id: string) => void;
  others?: readonly any[];
}

export const FieldCard = memo(function FieldCard({ 
  field, 
  isSelected, 
  accentColor = "#6366f1",
  isOverlay = false,
  currentUserId,
  sections = [],
  onUpdate,
  onRemove,
  onDuplicate,
  onMove,
  onClick,
  others = [],
}: FieldCardProps) {
  const Icon = FIELD_ICONS[field.type] ?? Type;
  
  // Find everyone else editing or dragging this field
  const editors = others.filter(o => o.presence?.selectedFieldId === field.id);
  const dragger = others.find(o => o.presence?.draggingFieldId === field.id);
  
  const isBeingEditedByOther = editors.length > 0;
  const isBeingDraggedByOther = !!dragger;
  
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isLocalDragging,
  } = useSortable({ id: field.id, disabled: isOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isOverlay ? "none" : transition,
  };

  const renderFieldPreview = () => {
    if (field.type === "section") {
      return (
        <div className="border-l-2 pl-3" style={{ borderColor: accentColor }}>
          <h3 className="font-semibold text-base text-foreground">{field.label}</h3>
          {field.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{field.description}</p>
          )}
        </div>
      );
    }
    if (field.type === "page_break") {
      return (
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-px flex-1 border-t-2 border-dashed border-muted-foreground/30" />
          <span className="text-xs font-medium uppercase tracking-wider">Page Break</span>
          <div className="h-px flex-1 border-t-2 border-dashed border-muted-foreground/30" />
        </div>
      );
    }
    if (["radio", "checkbox"].includes(field.type)) {
      return (
        <div className="space-y-1.5">
          {(field.options ?? []).slice(0, 3).map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={cn(
                "h-3.5 w-3.5 border border-muted-foreground/40 pointer-events-none shrink-0",
                field.type === "radio" ? "rounded-full" : "rounded-[3px]"
              )} />
              <span>{opt.label}</span>
            </div>
          ))}
          {(field.options?.length ?? 0) > 3 && (
            <p className="text-xs text-muted-foreground pl-5">
              +{(field.options?.length ?? 0) - 3} more options
            </p>
          )}
        </div>
      );
    }
    if (field.type === "select") {
      return (
        <div className="h-9 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground flex items-center justify-between pointer-events-none">
          <span>{field.placeholder || "Select an option..."}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </div>
      );
    }
    if (field.type === "multi_select") {
      return (
        <div className="min-h-9 w-full rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground flex items-center justify-between pointer-events-none">
          <span>{field.placeholder || "Select options..."}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </div>
      );
    }
    if (field.type === "rating") {
      const stars = field.properties?.stars ?? 5;
      return (
        <div className="flex gap-1">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} className="h-5 w-5 text-muted-foreground/30" />
          ))}
        </div>
      );
    }
    if (field.type === "scale") {
      const min = field.properties?.scaleMin ?? 1;
      const max = field.properties?.scaleMax ?? 10;
      return (
        <div className="space-y-1">
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
              <div key={n} className="h-8 w-8 rounded border border-muted-foreground/20 bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                {n}
              </div>
            ))}
          </div>
          {(field.properties?.scaleMinLabel || field.properties?.scaleMaxLabel) && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{field.properties?.scaleMinLabel}</span>
              <span>{field.properties?.scaleMaxLabel}</span>
            </div>
          )}
        </div>
      );
    }
    if (field.type === "long_text") {
      return (
        <div className="h-20 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground pointer-events-none resize-none">
          {field.placeholder || "Long answer text..."}
        </div>
      );
    }
    if (field.type === "date" || field.type === "time" || field.type === "datetime") {
      return (
        <div className="h-9 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground flex items-center justify-between pointer-events-none">
          <span>{field.type === "time" ? "hh:mm" : "mm/dd/yyyy"}</span>
          <Icon className="h-4 w-4" />
        </div>
      );
    }
    if (field.type === "file") {
      return (
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-md p-4 text-center text-sm text-muted-foreground pointer-events-none">
          <Upload className="h-5 w-5 mx-auto mb-1 opacity-50" />
          Click or drag file here
        </div>
      );
    }
    return (
      <div className="h-9 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground flex items-center pointer-events-none">
        {field.placeholder || "Your answer"}
      </div>
    );
  };

  const primaryEditor = editors[0];
  const editorColor = primaryEditor?.info?.color;
  const draggerColor = dragger?.info?.color;

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(field.id);
      }}
      className={cn(
        "group relative rounded-xl border bg-card cursor-pointer select-none",
        !isOverlay && "transition-all duration-300",
        isLocalDragging ? "opacity-0" : "opacity-100",
        isOverlay && "z-50 cursor-grabbing shadow-xl border-primary/50",
        isBeingEditedByOther && "ring-2 ring-offset-2",
        isBeingDraggedByOther && "opacity-50 scale-[0.98] border-dashed shadow-sm"
      )}
      style={{
        ...style,
        touchAction: "pan-y",
        borderColor: isBeingDraggedByOther 
          ? draggerColor 
          : isBeingEditedByOther 
            ? editorColor 
            : isSelected || isOverlay 
              ? accentColor 
              : undefined,
        boxShadow: isSelected || isOverlay 
          ? `0 0 0 4px ${accentColor}10, 0 4px 20px -4px ${accentColor}25` 
          : undefined,
        backgroundColor: isSelected && !isOverlay ? `${accentColor}05` : undefined,
        ...(isBeingEditedByOther ? { ringColor: editorColor } : {}),
      }}
    >
      {/* Collaborator Presence Glow/Indicator */}
      <AnimatePresence>
        {isBeingDraggedByOther && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-6 left-0 px-2 py-0.5 rounded-t-md text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5"
            style={{ backgroundColor: draggerColor }}
          >
            <Avatar className="h-4 w-4 border border-white/20 ring-offset-background">
              <AvatarImage src={dragger.info.avatar || undefined} />
              <AvatarFallback className="bg-transparent text-[8px]">
                {dragger.info.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <GripVertical className="h-3 w-3 animate-bounce" />
            {dragger.info.name} is moving this
          </motion.div>
        )}
        {isBeingEditedByOther && !isBeingDraggedByOther && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          className="absolute -top-7 left-4 px-2 py-1 rounded-t-lg text-[10px] font-bold text-white shadow-md flex items-center gap-2"
            style={{ backgroundColor: editorColor }}
          >
            <TooltipProvider delayDuration={0}>
              <div className="flex -space-x-1.5">
                {editors.map((ed) => (
                  <Tooltip key={ed.connectionId}>
                    <TooltipTrigger asChild>
                      <motion.div
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative z-0 hover:z-10 transition-all"
                      >
                        <Avatar className="h-5 w-5 border-2 border-white/20 ring-offset-background shadow-sm bg-background/20 backdrop-blur-sm">
                          <AvatarImage src={ed.info.avatar || undefined} />
                          <AvatarFallback className="bg-transparent text-[7px] text-white">
                            {ed.info.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[11px] py-1 px-2 font-medium">
                      {ed.info.name}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
            <div className="h-1 w-1 rounded-full bg-white animate-pulse" />
            <span className="max-w-[120px] truncate">
              {editors.length === 1 ? `${editors[0].info.name} is editing` : `${editors.length} people editing`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-2 -m-2 outline-none touch-none shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-row items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm text-foreground truncate">
                {field.label}
              </span>
              {field.required && (
                <span className="text-destructive text-sm leading-none shrink-0">*</span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0">
              <Badge variant="secondary" className="text-[10px] capitalize">
                {field.type.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {field.description && (
            <p className="text-xs text-muted-foreground -mt-1 text-balance">{field.description}</p>
          )}

          {renderFieldPreview()}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ 
            opacity: isSelected ? 1 : 0, 
            x: isSelected ? 0 : 10,
          }}
          whileHover={{ opacity: 1, x: 0 }}
          className={cn(
            "md:flex flex-col gap-0.5 transition-opacity shrink-0",
            "hidden md:group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
            <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDuplicate?.(field)}
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Field?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the <strong>{field.label}</strong> field? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.(field.id);
                  }} 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {sections.length > 1 && onMove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setMoveOpen(true)}
              title="Move to section"
            >
              <MoveRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </motion.div>

        {sections.length > 1 && onMove && (
          <FieldMoveDialog
            open={moveOpen}
            onOpenChange={setMoveOpen}
            sections={sections}
            currentSectionId={field.sectionId ?? null}
            accentColor={accentColor}
            onMove={(targetSectionId) => onMove(field.id, targetSectionId)}
          />
        )}
      </div>

    </div>
  );
});
