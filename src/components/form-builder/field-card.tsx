"use client";

import { useFormBuilder } from "@/hooks/use-form-builder";
import type { BuilderField } from "@/lib/form-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GripVertical, Trash2, Copy, Settings2, Star,
  Type, AlignLeft, Hash, Mail, Phone, Link2, Calendar, Clock,
  CircleDot, CheckSquare, ChevronDown, ListChecks,
  SlidersHorizontal, Heading, Columns2, Upload, CalendarClock,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
}

export function FieldCard({ 
  field, 
  isSelected, 
  accentColor = "#6366f1",
  isOverlay = false,
}: FieldCardProps) {
  const { selectField, removeField, duplicateField } = useFormBuilder();
  const Icon = FIELD_ICONS[field.type] ?? Type;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, disabled: isOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isOverlay ? "none" : transition,
  };

  // Field preview renderer
  const FieldPreview = () => {
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
                field.type === "radio" ? "rounded-full" : "rounded-sm"
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
    if (["select", "multi_select"].includes(field.type)) {
      return (
        <div className="h-9 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground flex items-center justify-between pointer-events-none">
          <span>{field.placeholder || "Select an option..."}</span>
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
    // Default: text-like input
    return (
      <div className="h-9 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground flex items-center pointer-events-none">
        {field.placeholder || "Your answer"}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative rounded-xl border bg-card cursor-pointer",
        !isDragging && !isOverlay && "transition-all duration-300",
        isSelected || isOverlay
          ? "shadow-md"
          : "border-border hover:border-muted-foreground/30 hover:shadow-sm",
        isDragging ? "opacity-0" : "opacity-100",
        isOverlay && "z-50 cursor-grabbing shadow-xl border-primary/50"
      )}
      style={{
        ...style,
        ...((isSelected || isOverlay) ? {
          borderColor: accentColor,
          boxShadow: isOverlay 
            ? `0 10px 30px -10px ${accentColor}40` 
            : `0 0 0 4px ${accentColor}10, 0 4px 20px -4px ${accentColor}25`,
          backgroundColor: isOverlay ? "var(--card)" : `${accentColor}05`,
        } : {})
      }}
      onClick={(e) => {
        if (isOverlay) return;
        e.stopPropagation();
        selectField(field.id);
      }}
    >
      {/* Left accent bar - Premium floating style */}
      {isSelected && (
        <div
          className="absolute left-1.5 top-3 bottom-3 w-1.5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground pt-0.5 outline-none touch-none shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Question label row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm text-foreground truncate">
                {field.label}
              </span>
              {field.required && (
                <span className="text-destructive text-sm leading-none shrink-0">*</span>
              )}
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <Badge variant="secondary" className="text-[10px] capitalize">
                {field.type.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {/* Field description */}
          {field.description && (
            <p className="text-xs text-muted-foreground -mt-1">{field.description}</p>
          )}

          {/* Preview */}
          <FieldPreview />
        </div>

          {/* Actions - Desktop sidebar / Mobile bottom bar */}
          <div
            className={cn(
              "md:flex flex-col gap-0.5 transition-opacity shrink-0",
              "hidden md:opacity-0 md:group-hover:opacity-100",
              isSelected && "md:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => duplicateField(field.id)}
              title="Duplicate"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => removeField(field.id)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Mobile Actions Bottom Row */}
        {isSelected && (
          <div 
            className="flex md:hidden items-center justify-end gap-2 px-3 pb-3 border-t border-border/50 pt-2 mx-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={() => duplicateField(field.id)}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => removeField(field.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>
  );
}
