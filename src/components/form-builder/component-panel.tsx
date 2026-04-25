"use client";

import { useState, useMemo } from "react";
import { useFormBuilder } from "@/hooks/use-form-builder";
import { FIELD_TYPE_META, FIELD_CATEGORIES } from "@/lib/form-types";
import type { FieldType, FieldCategory, FieldTypeMeta, BuilderField } from "@/lib/form-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMutation } from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";
import {
  Type, AlignLeft, Hash, Mail, Phone, Link, Calendar, Clock,
  CalendarClock, CircleDot, CheckSquare, ChevronDown, ListChecks,
  Star, SlidersHorizontal, Heading, Columns2, Upload, User, List,
  BarChart2, Eye, Paperclip, Search, LayoutGrid, Trash2, X,
  TextQuote, Minus, Video, Grid2X2, Grid2X2Check,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Type, AlignLeft, Hash, Mail, Phone, Link, Calendar, Clock,
  CalendarClock, CircleDot, CheckSquare, ChevronDown, ListChecks,
  Star, SlidersHorizontal, Heading, Columns2, Upload, User, List,
  BarChart2, Eye, Paperclip, Search, TextQuote, Minus, Video, Grid2X2, Grid2X2Check,
};

const CATEGORY_COLORS: Record<FieldCategory, string> = {
  text: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  contact: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  datetime: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  choice: "bg-green-500/15 text-green-600 dark:text-green-400",
  scale: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  visual: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  media: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
};

function DraggableSidebarItem({ item }: { item: FieldTypeMeta }) {
  const { selectedFieldId, selectField, currentSectionId } = useFormBuilder();
  const addField = useMutation(({ storage }, type: FieldType, sectionId: string | null) => {
    const list = storage.get("fields");
    
    // Find index of selected field to insert below it
    let insertIndex = list.length;
    if (selectedFieldId) {
      const selectedIndex = list.findIndex((f) => (f as any).get("id") === selectedFieldId);
      if (selectedIndex !== -1) {
        insertIndex = selectedIndex + 1;
      }
    }

    const newField: BuilderField = {
      id: crypto.randomUUID(),
      type,
      label: item.label,
      description: "",
      placeholder: "",
      required: false,
      orderIndex: insertIndex,
      isNew: true,
      sectionId: sectionId ?? undefined,
      options: item.defaultOptions ? [...item.defaultOptions] : undefined,
      properties: item.defaultProperties ? { ...item.defaultProperties } : undefined,
    };

    if (insertIndex < list.length) {
      list.insert(new LiveObject(newField), insertIndex);
    } else {
      list.push(new LiveObject(newField));
    }
    
    selectField(newField.id);
  }, [item, selectedFieldId]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new:${item.type}`,
    data: {
      type: item.type,
      isNew: true,
      label: item.label,
    },
  });

  const Icon = ICON_MAP[item.icon];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-cursor-id={item.type}
      style={{ touchAction: "pan-y" }}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm hover:bg-muted transition-colors group cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      onClick={() => addField(item.type as FieldType, currentSectionId)}
      title={item.description}
    >
      <div
        className={cn(
          "flex items-center justify-center h-7 w-7 rounded-md shrink-0",
          CATEGORY_COLORS[item.category]
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground text-xs leading-tight">
          {item.label}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {item.description}
        </div>
      </div>
    </div>
  );
}

interface ComponentPanelProps {
  onMobileClose?: () => void;
}

export function ComponentPanel({ onMobileClose }: ComponentPanelProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FieldCategory | "all">("all");

  const { setNodeRef, isOver } = useDroppable({
    id: "component-panel",
  });

  const filtered = useMemo(() => {
    return FIELD_TYPE_META.filter((m) => {
      if (m.type === "section" || m.type === "page_break") return false;
      const matchesSearch =
        !search ||
        m.label.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());
      const matchesCat =
        activeCategory === "all" || m.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<FieldCategory, typeof filtered>();
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return map;
  }, [filtered]);

  return (
    <div
      ref={setNodeRef}
      data-cursor-area-root="true"
      className={cn(
        "flex flex-col h-full bg-card min-h-0 relative transition-colors duration-200",
        isOver && "bg-destructive/10 ring-2 ring-inset ring-destructive/20"
      )}
    >
      {/* Drop area visual for deletion */}
      {isOver && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-[1px] pointer-events-none">
          <div className="bg-destructive text-destructive-foreground p-3 rounded-full shadow-lg mb-3">
            <Trash2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-destructive">Drop to Delete</p>
          <p className="text-[10px] text-destructive/70 mt-1">This will remove the field from your form</p>
        </div>
      )}

      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 px-1">
            Components
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        {onMobileClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 -mt-8"
            onClick={onMobileClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Category tabs */}
      <div className="px-2 py-2 border-b border-border">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
              activeCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            All
          </button>
          {FIELD_CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.icon];
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-2.5 w-2.5" />}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Field list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-3">
          {[...grouped.entries()].map(([category, items]) => {
            const catMeta = FIELD_CATEGORIES.find((c) => c.id === category);
            const CatIcon = catMeta ? ICON_MAP[catMeta.icon] : LayoutGrid;
            return (
              <div key={category}>
                {activeCategory === "all" && (
                  <div 
                    className="flex items-center gap-1.5 px-1 mb-1.5"
                    data-cursor-id={`cat:${category}`}
                    data-cursor-type="header"
                  >
                    {CatIcon && <CatIcon className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {catMeta?.label ?? category}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <DraggableSidebarItem key={item.type} item={item} />
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No components match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
