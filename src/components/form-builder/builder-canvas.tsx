"use client";

import { useEffect, useCallback, useState, useMemo } from "react";
import { useFormBuilder } from "@/hooks/use-form-builder";
import { useFormCollaboration } from "@/hooks/use-form-collaboration";
import { FieldCard } from "./field-card";
import { FormHeaderEditor } from "./form-header-editor";
import { ComponentPanel } from "./component-panel";
import { FieldSettings } from "./field-settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BuilderField, BuilderForm, BuilderSection, SectionType } from "@/lib/form-types";
import { SectionBar } from "./section-bar";
import { setFormStatus } from "@/lib/actions/forms";
import { sanitize, stripHtml } from "@/lib/sanitize";
import { toast } from "sonner";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  closestCorners,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  PlusCircle, Settings2, Palette,
  Plus, Loader2, Send, ChevronRight, CheckCircle2,
  GripVertical, Copy, Trash2, ChevronDown, MoveRight, Layers,
  X, CheckSquare2
} from "lucide-react";
import { FieldMoveDialog } from "./field-move-dialog";
import { SectionReorderDialog } from "./section-reorder-dialog";
import { SectionTypeDialog } from "./section-type-dialog";
import { ACCENT_COLORS, FIELD_TYPE_META } from "@/lib/form-types";
import { motion, AnimatePresence } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { CursorArea } from "./cursor-area";


interface BuilderCanvasProps {
  formId: string;
  initialForm: BuilderForm;
  initialFields: BuilderField[];
  initialSections?: BuilderSection[];
  currentUserId: string;
  canManageCollab: boolean;
  workspaceId: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Active Members Component ─────────────────────────────────────────────────
function ActiveMembers({ self, others }: { self: any, others: readonly any[] }) {
  const allUsers = useMemo(() => {
    const users = [];
    if (self) users.push({ ...self, isSelf: true });
    users.push(...others.map(o => ({ ...o, isSelf: false })));
    return users;
  }, [self, others]);

  if (allUsers.length === 0) return null;

  const displayUsers = allUsers.slice(0, 3);
  const showOverflow = allUsers.length > 3;
  const isOverflowEditing = showOverflow && allUsers.slice(3).some(u => u.presence?.selectedFieldId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-9 px-1.5 gap-1 hover:bg-muted/80 rounded-lg border border-transparent transition-all group"
        >
          <div className="flex items-center -space-x-1.5">
            {displayUsers.map((user, i) => (
              <TooltipProvider key={user.connectionId || 'self'}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar 
                        className={cn(
                          "h-6 w-6 border-2 border-card shrink-0 transition-all duration-300",
                          user.isSelf ? "z-10" : "z-0"
                        )}
                        style={{ backgroundColor: user.info?.color ?? "#ccc" }}
                      >
                        <AvatarImage src={user.info?.avatar || undefined} />
                        <AvatarFallback className="text-[9px] font-bold text-white bg-transparent">
                          {getInitials(user.info?.name ?? (user.isSelf ? "Me" : "U"))}
                        </AvatarFallback>
                      </Avatar>
                      {(user.presence?.selectedFieldId || user.presence?.selectedSectionId) && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-2 w-2 bg-emerald-500 rounded-full border-2 border-card z-20" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px] px-2 py-1">
                    {user.isSelf ? "You" : user.info?.name}
                    {(user.presence?.selectedFieldId || user.presence?.selectedSectionId) && (
                      <span className="text-muted-foreground ml-1">(editing)</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {showOverflow && (
              <div className="relative">
                <div className={cn(
                  "h-6 w-6 rounded-full border-2 border-card bg-muted text-muted-foreground flex items-center justify-center text-[9px] font-bold transition-all duration-300 z-0",
                )}>
                  +{allUsers.length - 3}
                </div>
                {isOverflowEditing && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-2 w-2 bg-emerald-500 rounded-full border-2 border-card z-20" />
                )}
              </div>
            )}
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56 p-1 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2">
        <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 rounded-t-md mb-1">
          Active Members ({allUsers.length})
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {allUsers.map((user) => (
            <div 
              key={user.connectionId || 'self'} 
              className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors group/item"
            >
              <div className="relative">
                <Avatar 
                  className={cn(
                    "h-7 w-7 shrink-0 border border-border/50 transition-all duration-300",
                    (user.presence?.selectedFieldId || user.presence?.selectedSectionId) && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background"
                  )}
                  style={{ backgroundColor: user.info?.color ?? "#ccc" }}
                >
                  <AvatarImage src={user.info?.avatar || undefined} />
                  <AvatarFallback className="text-[10px] font-bold text-white bg-transparent">
                    {getInitials(user.info?.name ?? (user.isSelf ? "Me" : "U"))}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate leading-tight">
                    {user.info?.name ?? (user.isSelf ? "You" : "Anonymous User")}
                  </span>
                  {user.isSelf && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">YOU</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                   <div className={cn(
                     "h-1.5 w-1.5 rounded-full animate-pulse",
                     (user.presence?.selectedFieldId || user.presence?.selectedSectionId) ? "bg-emerald-500" : "bg-muted-foreground/30"
                   )} />
                   <span className="text-[10px] text-muted-foreground font-medium truncate">
                    {(user.presence?.selectedFieldId || user.presence?.selectedSectionId) ? "Currently editing form" : "Spectating"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BuilderCanvas({
  formId,
  initialForm,
  initialFields,
  initialSections,
  currentUserId,
  canManageCollab,
  workspaceId,
}: BuilderCanvasProps) {
  const {
    selectedFieldId,
    selectField,
    isDragging,
    setIsDragging,
    currentSectionId,
    setCurrentSectionId,
    selectedSectionId,
    selectSection,
    multiSelectedFieldIds,
    toggleMultiSelect,
    clearMultiSelect,
    setMultiSelect,
  } = useFormBuilder();

  // ─── Liveblocks Engine ────────────────────────────────────────────────────
  const {
    fields,
    form,
    sections,
    others,
    self,
    addField: collabAddField,
    removeField: collabRemoveField,
    updateField: collabUpdateField,
    reorderFields: collabReorderFields,
    updateFormMeta: collabUpdateFormMeta,
    addSection: collabAddSection,
    removeSection: collabRemoveSection,
    updateSection: collabUpdateSection,
    reorderSection: collabReorderSection,
    duplicateSection: collabDuplicateSection,
  } = useFormCollaboration({
    formId,
    initialForm,
    initialFields,
    initialSections,
  });

  // ─── Section state bootstrap ───────────────────────────────────────────────
  // Once sections load, initialise currentSectionId to the first section
  useEffect(() => {
    if (sections.length > 0 && !currentSectionId) {
      setCurrentSectionId(sections[0].id);
    }
    // If the current section was deleted, reset to first
    if (currentSectionId && sections.length > 0 && !sections.find(s => s.id === currentSectionId)) {
      setCurrentSectionId(sections[0].id);
    }
  }, [sections, currentSectionId, setCurrentSectionId]);

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.orderIndex - b.orderIndex),
    [sections]
  );

  const activeSectionId = currentSectionId ?? sortedSections[0]?.id ?? null;
  const currentSectionIndex = sortedSections.findIndex(s => s.id === activeSectionId);
  const currentSection = sortedSections[currentSectionIndex] ?? null;

  // Fields belonging to the currently displayed section
  const sectionFields = useMemo(() => {
    if (!activeSectionId) return fields;
    return fields.filter(f => f.sectionId === activeSectionId);
  }, [fields, activeSectionId]);

  const isMultiSelectMode = multiSelectedFieldIds.size > 0;
  const multiCount = multiSelectedFieldIds.size;

  const [isSectionTypeOpen, setIsSectionTypeOpen] = useState(false);
  const [pendingAddAfterIndex, setPendingAddAfterIndex] = useState<number>(0);
  const [isMultiDeleteOpen, setIsMultiDeleteOpen] = useState(false);
  const [isMultiMoveOpen, setIsMultiMoveOpen] = useState(false);

  const handleAddSection = useCallback((afterIndex: number) => {
    setPendingAddAfterIndex(afterIndex);
    setIsSectionTypeOpen(true);
  }, []);

  const handleCreateSectionWithType = useCallback((type: SectionType) => {
    const label = type === "success" ? "Success Page" : `Section ${sections.length + 1}`;
    const newSection: BuilderSection = {
      id: crypto.randomUUID(),
      name: label,
      description: "",
      orderIndex: pendingAddAfterIndex + 1,
      type,
    };
    collabAddSection(newSection);
    setCurrentSectionId(newSection.id);
    selectSection(newSection.id);
    toast.success("Section added", { description: `"${label}" has been created` });
  }, [sections, pendingAddAfterIndex, collabAddSection, setCurrentSectionId, selectSection]);

  const handleDeleteSection = useCallback((id: string) => {
    const section = sortedSections.find(s => s.id === id);
    const idx = sortedSections.findIndex(s => s.id === id);
    const next = sortedSections[idx + 1] ?? sortedSections[idx - 1];
    if (next) setCurrentSectionId(next.id);
    fields.filter(f => f.sectionId === id).forEach(f => collabRemoveField(f.id));
    collabRemoveSection(id);
    toast.success("Section deleted", {
      description: section ? `"${section.name}" and its fields have been removed` : undefined,
    });
  }, [sortedSections, fields, collabRemoveField, collabRemoveSection, setCurrentSectionId]);

  const handleDuplicateSection = useCallback((id: string) => {
    const newId = crypto.randomUUID();
    collabDuplicateSection(id, newId);
    setCurrentSectionId(newId);
    selectSection(newId);
    toast.success("Section duplicated", { description: "You are now viewing the duplicate" });
  }, [collabDuplicateSection, setCurrentSectionId, selectSection]);

  const handleReorderSection = useCallback((id: string, toIndex: number) => {
    collabReorderSection(id, toIndex);
    // Keep the moved section current + selected so the user can keep moving it
    setCurrentSectionId(id);
    selectSection(id);
  }, [collabReorderSection, setCurrentSectionId, selectSection]);

  const handleNavigateSection = useCallback((id: string) => {
    setCurrentSectionId(id);
    selectField(null);
    selectSection(null);
    clearMultiSelect();
  }, [setCurrentSectionId, selectField, selectSection, clearMultiSelect]);

  const handleOpenSectionSettings = useCallback((id: string) => {
    if (selectedSectionId === id) {
      selectSection(null);
    } else {
      selectSection(id);
      selectField(null);
    }
  }, [selectedSectionId, selectSection, selectField]);

  const CanvasDroppable = useCallback(({ children }: { children: React.ReactNode }) => {
    const { setNodeRef } = useDroppable({ id: "canvas" });
    return <div ref={setNodeRef}>{children}</div>;
  }, []);

  // Localized cursor tracking is now handled by CursorArea wrappers

  const accentColor = form?.accentColor ?? "#6366f1";
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMoveFieldOpen, setIsMoveFieldOpen] = useState(false);
  const [isSectionReorderOpen, setIsSectionReorderOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);


  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 8 } });
  // Touch: require 200ms hold on the drag handle (data-dnd-handle) before activating.
  // Non-handle areas are excluded via the canStartDragging check so normal scroll works.
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  const dndSensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    if (!String(active.id).startsWith("new:")) {
      selectField(active.id as string);
    }
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setIsDragging(false);
    const { active, over } = event;
    if (!over) return;

    // Handle dropping back to sidebar (Delete or Cancel)
    if (over.id === "component-panel") {
      if (!String(active.id).startsWith("new:")) {
        collabRemoveField(active.id as string);
        toast.info("Field removed", {
          description: "Field has been moved back to components",
        });
      }
      return;
    }

    // Handle adding new components
    if (String(active.id).startsWith("new:")) {
      const type = String(active.id).split(":")[1];
      const meta = FIELD_TYPE_META.find((m) => m.type === type);
      
      const newField: BuilderField = {
        id: crypto.randomUUID(),
        type: type as any,
        label: meta?.defaultLabel ?? `New ${type.replace(/_/g, " ")}`,
        placeholder: meta?.defaultLabel ? `Enter ${meta.defaultLabel.toLowerCase()}...` : `Enter ${type.replace(/_/g, " ")}...`,
        required: false,
        isNew: true,
        sectionId: activeSectionId ?? undefined,
        options: meta?.defaultOptions ? [...meta.defaultOptions] : undefined,
        properties: meta?.defaultProperties ? { ...meta.defaultProperties } : undefined,
        orderIndex: fields.length,
      };

      // Determine drop position (only add if on canvas or field)
      if (over.id === "canvas") {
        collabAddField(newField);
        setTimeout(() => selectField(newField.id), 50);
      } else {
        const overIdx = fields.findIndex((f) => f.id === over.id);
        if (overIdx !== -1) {
          collabAddField(newField, overIdx);
          setTimeout(() => selectField(newField.id), 50);
        }
      }
    } else if (active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        collabReorderFields(oldIndex, newIndex);
      }
    }
  };


  const handleUpdateField = useCallback((id: string, changes: Partial<BuilderField>) => {
    collabUpdateField(id, changes);
  }, [collabUpdateField]);

  const handleRemoveField = useCallback((id: string) => {
    collabRemoveField(id);
  }, [collabRemoveField]);

  const handleMoveField = useCallback((fieldId: string, targetSectionId: string) => {
    collabUpdateField(fieldId, { sectionId: targetSectionId });
  }, [collabUpdateField]);

  const handleDuplicateField = useCallback((field: BuilderField) => {
    const copy = { ...field, id: crypto.randomUUID(), label: `${field.label} (Copy)`, isNew: true, sectionId: activeSectionId ?? undefined };
    const idx = fields.findIndex(f => f.id === field.id);
    collabAddField(copy, idx + 1);
    // Automatically select the duplicated field
    setTimeout(() => selectField(copy.id), 50);
  }, [fields, collabAddField, activeSectionId, selectField]);

  const handleFieldClick = useCallback((id: string) => {
    if (isMultiSelectMode) {
      toggleMultiSelect(id);
      return;
    }
    if (selectedFieldId === id) {
      selectField(null);
    } else {
      selectField(id);
    }
  }, [selectedFieldId, selectField, isMultiSelectMode, toggleMultiSelect]);

  // ─── Bulk operations (multi-select) ─────────────────────────────────────────
  const handleBulkDuplicate = useCallback(() => {
    const ids = Array.from(multiSelectedFieldIds);
    for (const id of ids) {
      const field = fields.find(f => f.id === id);
      if (!field) continue;
      const copy = { ...field, id: crypto.randomUUID(), label: `${field.label} (Copy)`, isNew: true };
      const idx = fields.findIndex(f => f.id === id);
      collabAddField(copy, idx + 1);
    }
    clearMultiSelect();
    toast.success(`Duplicated ${ids.length} field${ids.length > 1 ? "s" : ""}`);
  }, [multiSelectedFieldIds, fields, collabAddField, clearMultiSelect]);

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(multiSelectedFieldIds);
    for (const id of ids) {
      collabRemoveField(id);
    }
    clearMultiSelect();
    toast.success(`Deleted ${ids.length} field${ids.length > 1 ? "s" : ""}`);
  }, [multiSelectedFieldIds, collabRemoveField, clearMultiSelect]);

  const handleBulkMove = useCallback((targetSectionId: string) => {
    const ids = Array.from(multiSelectedFieldIds);
    for (const id of ids) {
      collabUpdateField(id, { sectionId: targetSectionId });
    }
    clearMultiSelect();
    toast.success(`Moved ${ids.length} field${ids.length > 1 ? "s" : ""}`);
  }, [multiSelectedFieldIds, collabUpdateField, clearMultiSelect]);

  const handleSelectAllInSection = useCallback(() => {
    const ids = sectionFields
      .filter(f => !["page_break", "section", "paragraph", "divider"].includes(f.type))
      .map(f => f.id);
    setMultiSelect(ids);
  }, [sectionFields, setMultiSelect]);

  return (
    <DndContext
      sensors={dndSensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full overflow-hidden bg-muted/30">
        {/* Left Side: Components (Desktop) */}
        <CursorArea id="components" className="w-72 shrink-0 hidden md:flex flex-col border-r border-border bg-card overflow-hidden">
          <ComponentPanel />
        </CursorArea>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          {/* Header */}
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
                <ActiveMembers self={self} others={others} />

              <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
              
              <div className="flex items-center gap-1.5 min-w-0">
                <Badge variant="secondary" className={cn(
                  "px-2 py-0.5 text-[10px] font-bold uppercase",
                  form.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                )}>
                  {form.status}
                </Badge>
                <div className="flex flex-col">
                  <div 
                    className="text-xs font-semibold prose-xs max-w-full truncate leading-none"
                    dangerouslySetInnerHTML={{ __html: sanitize(form.title) }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Section picker */}
              {sortedSections.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 max-w-[140px] sm:max-w-[200px]">
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs font-medium">{currentSection ? stripHtml(currentSection.name) : "Section"}</span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px] max-h-72 overflow-y-auto">
                    {sortedSections.map((sec, idx) => (
                      <DropdownMenuItem
                        key={sec.id}
                        onClick={() => handleNavigateSection(sec.id)}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          sec.id === activeSectionId && "font-semibold"
                        )}
                      >
                        <span
                          className="h-5 min-w-[20px] px-1.5 rounded text-[10px] font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate">{stripHtml(sec.name)}</span>
                        {sec.id === activeSectionId && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Accent colour picker */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Palette className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="p-3 grid grid-cols-4 gap-2">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        className={cn(
                          "h-6 w-6 rounded-full border ring-offset-2 transition-all",
                          accentColor === c.value ? "ring-2 ring-primary" : "hover:scale-110"
                        )}
                        style={{ backgroundColor: c.value }}
                        onClick={() => collabUpdateFormMeta({ accentColor: c.value })}
                      />
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Canvas — one unified CursorArea per section, keyed so switching section
               fully remounts the area and resets all live cursors to the new page */}
          <div className="flex-1 h-full min-h-0 bg-muted/30 overflow-y-auto" onClick={() => { selectField(null); selectSection(null); clearMultiSelect(); }}>
            <CursorArea
              key={activeSectionId ?? "no-section"}
              id={`canvas-${activeSectionId ?? "no-section"}`}
              className="min-h-full"
              isDragging={isDragging}
              onClick={() => { selectField(null); selectSection(null); }}
            >
              <div className="max-w-2xl mx-auto p-4 md:p-8 pb-32">
                <CanvasDroppable>
                  {/* Single data-cursor-area-root — the cursor detection grid covers
                       header → section-bar-top → fields → section-bar-bottom as one tree */}
                  <div data-cursor-area-root="true" className="space-y-8">

                    {/* Row: Form header (shared across all sections) */}
                    <div data-cursor-id="header" data-cursor-type="header">
                      <FormHeaderEditor
                        accentColor={accentColor}
                        title={form?.title}
                        description={form?.description}
                        onUpdate={(changes) => collabUpdateFormMeta(changes)}
                        workspaceId={workspaceId}
                      />
                    </div>

                    {currentSection && (
                      <div className="space-y-4">
                        {/* Row: Section navigation bar (top) */}
                        <div
                          data-cursor-id={`section-bar-top-${currentSection.id}`}
                          data-cursor-type="header"
                        >
                          <SectionBar
                            sections={sortedSections}
                            currentSection={currentSection}
                            currentIndex={currentSectionIndex}
                            isSelected={selectedSectionId === currentSection.id}
                            onSelect={handleOpenSectionSettings}
                            onOpenSettings={handleOpenSectionSettings}
                            onReorder={handleReorderSection}
                            onDuplicate={handleDuplicateSection}
                            onDelete={handleDeleteSection}
                            onAddAfter={handleAddSection}
                            accentColor={accentColor}
                            others={others}
                          />
                        </div>

                        {/* Rows: Fields */}
                        <SortableContext items={sectionFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-4">
                            <AnimatePresence>
                              {sectionFields.map((field) => (
                                <motion.div
                                  key={field.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  data-cursor-id={field.id}
                                  data-cursor-type="field"
                                >
                                  <FieldCard
                                    field={field}
                                    isSelected={selectedFieldId === field.id}
                                    isMultiSelected={multiSelectedFieldIds.has(field.id)}
                                    isMultiSelectMode={isMultiSelectMode}
                                    accentColor={accentColor}
                                    currentUserId={currentUserId}
                                    sections={sortedSections}
                                    onUpdate={handleUpdateField}
                                    onRemove={handleRemoveField}
                                    onDuplicate={handleDuplicateField}
                                    onMove={handleMoveField}
                                    onClick={handleFieldClick}
                                    onToggleMultiSelect={toggleMultiSelect}
                                    others={others}
                                  />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </SortableContext>

                        {sectionFields.length === 0 && currentSection.type !== "success" && (
                          <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 text-center">
                            <PlusCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-sm font-medium">Start building your form</p>
                            <p className="text-xs text-muted-foreground mt-1">Drag components here to begin</p>
                          </div>
                        )}

                        {sectionFields.length === 0 && currentSection.type === "success" && (
                          <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-10 text-center">
                            <div className="h-10 w-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium">Success Page</p>
                            <p className="text-xs text-muted-foreground mt-1">This page is shown after form submission. Add fields or content as needed.</p>
                          </div>
                        )}

                        {/* Section action button indicator */}
                        {currentSection.type !== "success" && (() => {
                          const isSubmit = currentSection.type === "submit";
                          const destSection = currentSection.nextSectionId && currentSection.nextSectionId !== "__auto__"
                            ? sortedSections.find(s => s.id === currentSection.nextSectionId)
                            : null;
                          const destLabel = destSection
                            ? stripHtml(destSection.name) || "(untitled)"
                            : null;
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenSectionSettings(currentSection.id)}
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                                  isSubmit
                                    ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                                    : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                                )}
                              >
                                {isSubmit ? (
                                  <>
                                    <Send className="h-3.5 w-3.5" />
                                    Submit
                                  </>
                                ) : (
                                  <>
                                    Next
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </>
                                )}
                              </button>
                              {destLabel && (
                                <span className="text-[10px] text-muted-foreground">
                                  → {destLabel}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Row: Section navigation bar (bottom) */}
                        <div
                          data-cursor-id={`section-bar-bottom-${currentSection.id}`}
                          data-cursor-type="header"
                        >
                          <SectionBar
                            sections={sortedSections}
                            currentSection={currentSection}
                            currentIndex={currentSectionIndex}
                            isSelected={selectedSectionId === currentSection.id}
                            onSelect={handleOpenSectionSettings}
                            onOpenSettings={handleOpenSectionSettings}
                            onReorder={handleReorderSection}
                            onDuplicate={handleDuplicateSection}
                            onDelete={handleDeleteSection}
                            onAddAfter={handleAddSection}
                            accentColor={accentColor}
                            others={others}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CanvasDroppable>
              </div>
            </CursorArea>
          </div>

          {/* Mobile Footer Action Bar */}
          {isMultiSelectMode ? (
            /* ─── Mobile: Multi-select bar ───────────────────────────────── */
            <div className="md:hidden h-16 border-t border-border bg-card flex items-center justify-around px-2 shrink-0 z-30 pb-safe">
              <Button variant="ghost" size="sm" className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[56px]" onClick={clearMultiSelect}>
                <X className="h-5 w-5" />
                <span className="text-[10px] font-medium">{multiCount}</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[56px]" onClick={handleSelectAllInSection}>
                <CheckSquare2 className="h-5 w-5" />
                <span className="text-[10px] font-medium">All</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[56px]" onClick={handleBulkDuplicate}>
                <Copy className="h-5 w-5" />
                <span className="text-[10px] font-medium">Duplicate</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[56px]" onClick={() => setIsMultiMoveOpen(true)} disabled={sections.length <= 1}>
                <MoveRight className="h-5 w-5" />
                <span className="text-[10px] font-medium">Move</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[56px] text-destructive" onClick={() => setIsMultiDeleteOpen(true)}>
                <Trash2 className="h-5 w-5" />
                <span className="text-[10px] font-medium">Delete</span>
              </Button>
            </div>
          ) : (
            /* ─── Mobile: Normal bar ─────────────────────────────────────── */
            <div className="md:hidden h-16 border-t border-border bg-card flex items-center justify-around px-2 shrink-0 z-30 pb-safe">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[64px]" 
                onClick={() => {
                  if (selectedSectionId) {
                    handleAddSection(currentSectionIndex);
                  } else {
                    setIsComponentsOpen(true);
                  }
                }}
              >
                <Plus className={cn("h-5 w-5", selectedSectionId ? "text-foreground" : "text-primary")} />
                <span className="text-[10px] font-medium">{selectedSectionId ? "Add Section" : "Add"}</span>
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[64px]" 
                onClick={() => {
                  if (selectedSectionId) {
                    handleDuplicateSection(selectedSectionId);
                  } else {
                    const field = fields.find(f => f.id === selectedFieldId);
                    if (field) handleDuplicateField(field);
                  }
                }}
                disabled={!selectedFieldId && !selectedSectionId}
              >
                <Copy className="h-5 w-5" />
                <span className="text-[10px] font-medium">Duplicate</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[64px]"
                onClick={() => {
                  if (selectedSectionId) setIsSectionReorderOpen(true);
                  else setIsMoveFieldOpen(true);
                }}
                disabled={
                  (!selectedFieldId && !selectedSectionId) ||
                  (!!selectedFieldId && sections.length <= 1) ||
                  (!!selectedSectionId && sections.length <= 1)
                }
              >
                <MoveRight className="h-5 w-5" />
                <span className="text-[10px] font-medium">Move</span>
              </Button>

              <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[64px] text-destructive disabled:opacity-30" 
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={(!selectedFieldId && !selectedSectionId) || (!!selectedSectionId && sections.length === 1)}
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Delete</span>
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{selectedSectionId ? "Delete Section?" : "Delete Field?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {selectedSectionId
                        ? "This will permanently delete this section and all its fields. This cannot be undone."
                        : "Are you sure you want to delete the selected field? This action cannot be undone."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => {
                        if (selectedSectionId) {
                          handleDeleteSection(selectedSectionId);
                          selectSection(null);
                        } else if (selectedFieldId) {
                          handleRemoveField(selectedFieldId);
                          selectField(null);
                        }
                      }} 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button 
                variant="ghost" 
                size="sm" 
                className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[64px]" 
                onClick={() => setIsSettingsOpen(true)} 
                disabled={!selectedFieldId && !selectedSectionId}
              >
                <Settings2 className="h-5 w-5" />
                <span className="text-[10px] font-medium">Properties</span>
              </Button>
            </div>
          )}

          {/* Desktop: Multi-select action bar */}
          <AnimatePresence>
            {isMultiSelectMode && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", damping: 24, stiffness: 300 }}
                className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50 items-center gap-1 rounded-xl border border-border bg-card shadow-xl px-2 py-1.5"
              >
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs" onClick={clearMultiSelect}>
                  <X className="h-3.5 w-3.5" />
                  {multiCount} selected
                </Button>
                <div className="w-px h-5 bg-border" />
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs" onClick={handleSelectAllInSection}>
                  <CheckSquare2 className="h-3.5 w-3.5" />
                  Select all
                </Button>
                <div className="w-px h-5 bg-border" />
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs" onClick={handleBulkDuplicate}>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs" onClick={() => setIsMultiMoveOpen(true)} disabled={sections.length <= 1}>
                  <MoveRight className="h-3.5 w-3.5" />
                  Move
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-3 text-xs text-destructive hover:text-destructive" onClick={() => setIsMultiDeleteOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Multi-select: Field Move Dialog */}
          <FieldMoveDialog
            open={isMultiMoveOpen}
            onOpenChange={setIsMultiMoveOpen}
            sections={sortedSections}
            currentSectionId={activeSectionId}
            accentColor={accentColor}
            onMove={handleBulkMove}
          />

          {/* Multi-select: Delete Confirm Dialog */}
          <AlertDialog open={isMultiDeleteOpen} onOpenChange={setIsMultiDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {multiCount} field{multiCount > 1 ? "s" : ""}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected field{multiCount > 1 ? "s" : ""}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Mobile: Field Move Dialog (single) */}
          <FieldMoveDialog
            open={isMoveFieldOpen}
            onOpenChange={setIsMoveFieldOpen}
            sections={sortedSections}
            currentSectionId={selectedFieldId ? (fields.find(f => f.id === selectedFieldId)?.sectionId ?? null) : null}
            accentColor={accentColor}
            onMove={(targetSectionId) => {
              if (selectedFieldId) handleMoveField(selectedFieldId, targetSectionId);
            }}
          />

          {/* Mobile: Section Reorder Dialog */}
          <SectionReorderDialog
            open={isSectionReorderOpen}
            onOpenChange={setIsSectionReorderOpen}
            sections={sortedSections}
            currentSectionId={selectedSectionId}
            accentColor={accentColor}
            others={others}
            onReorder={handleReorderSection}
          />

          {/* Section Type Picker Dialog */}
          <SectionTypeDialog
            open={isSectionTypeOpen}
            onOpenChange={setIsSectionTypeOpen}
            onSelect={handleCreateSectionWithType}
          />
        </div>

        {/* Right Panel */}
        <CursorArea id={`settings-${selectedFieldId || selectedSectionId || 'none'}`} className="w-80 shrink-0 hidden lg:flex flex-col border-l border-border h-full bg-card overflow-hidden">
          <FieldSettings 
            currentUserId={currentUserId} 
            field={fields.find(f => f.id === selectedFieldId)}
            selectedSection={selectedSectionId ? sections.find(s => s.id === selectedSectionId) : undefined}
            onUpdateSection={(changes) => selectedSectionId && collabUpdateSection(selectedSectionId, changes)}
            sections={sortedSections}
            onUpdate={(changes) => selectedFieldId && collabUpdateField(selectedFieldId, changes)}
            onAddOption={() => {
              if (selectedFieldId) {
                const field = fields.find(f => f.id === selectedFieldId);
                if (field) {
                  const options = [...(field.options || [])];
                  const idx = options.length + 1;
                  options.push({ label: `Option ${idx}`, value: `option_${idx}` });
                  collabUpdateField(selectedFieldId, { options });
                }
              }
            }}
            onRemoveOption={(idx) => {
              if (selectedFieldId) {
                const field = fields.find(f => f.id === selectedFieldId);
                if (field?.options) {
                  const options = [...field.options];
                  options.splice(idx, 1);
                  collabUpdateField(selectedFieldId, { options });
                }
              }
            }}
            onUpdateOption={(idx, label) => {
              if (selectedFieldId) {
                const field = fields.find(f => f.id === selectedFieldId);
                if (field?.options) {
                  const options = [...field.options];
                  options[idx] = { ...options[idx], label };
                  collabUpdateField(selectedFieldId, { options });
                }
              }
            }}
            onReorderOptions={(from, to) => {
              if (selectedFieldId) {
                const field = fields.find(f => f.id === selectedFieldId);
                if (field?.options) {
                  const options = arrayMove(field.options, from, to);
                  collabUpdateField(selectedFieldId, { options });
                }
              }
            }}
            onMobileClose={() => {}}
            workspaceId={workspaceId}
          />
        </CursorArea>
      </div>

      {/* Mobile Component Panel */}
      <Sheet open={isComponentsOpen} onOpenChange={setIsComponentsOpen}>
        <SheetContent side="left" className="p-0 w-80" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Components</SheetTitle>
            <SheetDescription>
              Add new components to your form
            </SheetDescription>
          </SheetHeader>
          <CursorArea id="components" className="h-[calc(100%-1px)]">
            <ComponentPanel onMobileClose={() => setIsComponentsOpen(false)} />
          </CursorArea>
        </SheetContent>
      </Sheet>

      {/* Mobile Settings Panel */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="p-0 w-full sm:w-80" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Field Properties</SheetTitle>
            <SheetDescription>
              Edit the properties of the selected field
            </SheetDescription>
          </SheetHeader>
          <CursorArea id={`settings-${selectedFieldId || selectedSectionId || 'none'}`} className="h-[calc(100%-1px)]">
            <FieldSettings 
              currentUserId={currentUserId} 
              field={fields.find(f => f.id === selectedFieldId)}
              selectedSection={selectedSectionId ? sections.find(s => s.id === selectedSectionId) : undefined}
              onUpdateSection={(changes) => selectedSectionId && collabUpdateSection(selectedSectionId, changes)}
              sections={sortedSections}
              onUpdate={(changes) => selectedFieldId && collabUpdateField(selectedFieldId, changes)}
              onAddOption={() => {
                if (selectedFieldId) {
                  const field = fields.find(f => f.id === selectedFieldId);
                  if (field) {
                    const options = [...(field.options || [])];
                    const idx = options.length + 1;
                    options.push({ label: `Option ${idx}`, value: `option_${idx}` });
                    collabUpdateField(selectedFieldId, { options });
                  }
                }
              }}
              onRemoveOption={(idx) => {
                if (selectedFieldId) {
                  const field = fields.find(f => f.id === selectedFieldId);
                  if (field?.options) {
                    const options = [...field.options];
                    options.splice(idx, 1);
                    collabUpdateField(selectedFieldId, { options });
                  }
                }
              }}
              onUpdateOption={(idx, label) => {
                if (selectedFieldId) {
                  const field = fields.find(f => f.id === selectedFieldId);
                  if (field?.options) {
                    const options = [...field.options];
                    options[idx] = { ...options[idx], label };
                    collabUpdateField(selectedFieldId, { options });
                  }
                }
              }}
              onReorderOptions={(from, to) => {
                if (selectedFieldId) {
                  const field = fields.find(f => f.id === selectedFieldId);
                  if (field?.options) {
                    const options = arrayMove(field.options, from, to);
                    collabUpdateField(selectedFieldId, { options });
                  }
                }
              }}
              onMobileClose={() => setIsSettingsOpen(false)}
              workspaceId={workspaceId}
            />
          </CursorArea>
        </SheetContent>
      </Sheet>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: "0.5",
            },
          },
        }),
      }}>
        {activeId && !String(activeId).startsWith("new:") ? (
          <FieldCard
            field={fields.find(f => f.id === activeId)!}
            accentColor={accentColor}
            currentUserId={currentUserId}
            sections={sortedSections}
            onMove={handleMoveField}
            isSelected
            isOverlay
            others={[]}
          />
        ) : activeId && String(activeId).startsWith("new:") ? (
          <div className="w-full max-w-2xl px-4 md:px-8 pointer-events-none">
             <div 
               className="rounded-xl border border-primary bg-card/50 backdrop-blur-sm p-4 shadow-xl opacity-90 flex items-center gap-3"
               style={{ borderColor: accentColor }}
             >
                <div 
                  className="h-8 w-8 rounded flex items-center justify-center bg-primary/10"
                  style={{ color: accentColor }}
                >
                   <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                   <p className="font-semibold text-sm">Add {activeId.split(':')[1].replace(/_/g, " ")}</p>
                   <p className="text-[10px] text-muted-foreground uppercase tracking-wider">New component</p>
                </div>
             </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
