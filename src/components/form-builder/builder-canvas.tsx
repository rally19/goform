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
import type { BuilderField, BuilderForm } from "@/lib/form-types";
import { setFormStatus } from "@/lib/actions/forms";
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
  PlusCircle, Settings2, Palette, Check,
  Plus, Loader2,
  GripVertical, Copy, Trash2, ChevronDown
} from "lucide-react";
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
  currentUserId: string;
  canManageCollab: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Collaborator avatar stack ─────────────────────────────────────────────────
function CollaboratorAvatars({ others }: { others: readonly any[] }) {
  if (others.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center -space-x-2">
        {others.slice(0, 4).map(({ connectionId, info, presence }) => (
          <Tooltip key={connectionId}>
            <TooltipTrigger asChild>
              <Avatar 
                className="h-7 w-7 border-2 border-card ring-offset-background shrink-0 cursor-default"
                style={{ backgroundColor: info?.color ?? "#ccc" }}
              >
                <AvatarImage src={info?.avatar || undefined} />
                <AvatarFallback className="text-[10px] font-bold text-white bg-transparent">
                  {getInitials(info?.name ?? "U")}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {info?.name}
              {presence?.selectedFieldId && (
                <span className="text-muted-foreground ml-1">(editing)</span>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
        {others.length > 4 && (
          <div className="h-7 w-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
            +{others.length - 4}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export function BuilderCanvas({
  formId,
  initialForm,
  initialFields,
  currentUserId,
  canManageCollab,
}: BuilderCanvasProps) {
  const {
    selectedFieldId,
    selectField,
    setIsDragging,
  } = useFormBuilder();

  // ─── Liveblocks Engine ────────────────────────────────────────────────────
  const {
    fields,
    form,
    others,
    self,
    addField: collabAddField,
    removeField: collabRemoveField,
    updateField: collabUpdateField,
    reorderFields: collabReorderFields,
    updateFormMeta: collabUpdateFormMeta,
  } = useFormCollaboration({
    formId,
    initialForm,
    initialFields,
  });

  const CanvasDroppable = useCallback(({ children }: { children: React.ReactNode }) => {
    const { setNodeRef } = useDroppable({ id: "canvas" });
    return <div ref={setNodeRef}>{children}</div>;
  }, []);

  // Localized cursor tracking is now handled by CursorArea wrappers

  const accentColor = form?.accentColor ?? "#6366f1";
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useMemo(() => [
    { sensor: MouseSensor, options: { activationConstraint: { distance: 10 } } },
    { sensor: TouchSensor, options: { activationConstraint: { delay: 150, tolerance: 5 } } }
  ], []);

  const dndSensors = useSensors(
    useSensor(sensors[0].sensor, sensors[0].options),
    useSensor(sensors[1].sensor, sensors[1].options)
  );

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

  const handleDuplicateField = useCallback((field: BuilderField) => {
    const copy = { ...field, id: crypto.randomUUID(), label: `${field.label} (Copy)`, isNew: true };
    const idx = fields.findIndex(f => f.id === field.id);
    collabAddField(copy, idx + 1);
  }, [fields, collabAddField]);

  const handleFieldClick = useCallback((id: string) => {
    if (selectedFieldId === id) {
      selectField(null);
    } else {
      selectField(id);
    }
  }, [selectedFieldId, selectField]);

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
               <div className="hidden sm:flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border">
                  <Avatar 
                    className="h-7 w-7 border-2 border-background shadow-sm shrink-0"
                    style={{ backgroundColor: self?.info?.color }}
                  >
                    <AvatarImage src={self?.info?.avatar || undefined} />
                    <AvatarFallback className="text-[10px] font-bold text-white bg-transparent">
                      {getInitials(self?.info?.name ?? "Me")}
                    </AvatarFallback>
                  </Avatar>
                  <CollaboratorAvatars others={others as any} />
               </div>

              <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
              
              <div className="flex items-center gap-1.5 min-w-0">
                <Badge variant="secondary" className={cn(
                  "px-2 py-0.5 text-[10px] font-bold uppercase",
                  form.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                )}>
                  {form.status}
                </Badge>
                <div className="flex flex-col">
                  <h1 className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[200px] leading-none">
                    {form.title}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
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

          {/* Canvas */}
          <div className="flex-1 h-full min-h-0 bg-muted/30 overflow-y-auto" onClick={() => selectField(null)}>
            <CursorArea id="canvas" className="min-h-full" onClick={() => selectField(null)}>
              <div className="max-w-2xl mx-auto p-4 md:p-8 pb-32">
                <CanvasDroppable>
                <div data-cursor-area-root="true" className="space-y-8">
                  <div data-cursor-id="header" data-cursor-type="header">
                    <FormHeaderEditor 
                      accentColor={accentColor} 
                      title={form?.title}
                      description={form?.description}
                      onUpdate={(changes) => collabUpdateFormMeta(changes)}
                    />
                  </div>

                  <div className="space-y-4">
                    <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        <AnimatePresence>
                          {fields.map((field) => (
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
                                accentColor={accentColor}
                                currentUserId={currentUserId}
                                onUpdate={handleUpdateField}
                                onRemove={handleRemoveField}
                                onDuplicate={handleDuplicateField}
                                onClick={handleFieldClick}
                                others={others}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </SortableContext>
                    {fields.length === 0 && (
                      <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 text-center">
                        <PlusCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm font-medium">Start building your form</p>
                        <p className="text-xs text-muted-foreground mt-1">Drag components here to begin</p>
                      </div>
                    )}
                  </div>
                </div>
                </CanvasDroppable>
              </div>
            </CursorArea>
          </div>

          {/* Mobile Footer Action Bar */}
          <div className="md:hidden h-16 border-t border-border bg-card flex items-center justify-around px-2 shrink-0 z-30 pb-safe">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[64px]" 
              onClick={() => setIsComponentsOpen(true)}
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium">Add</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[64px]" 
              onClick={() => {
                const field = fields.find(f => f.id === selectedFieldId);
                if (field) handleDuplicateField(field);
              }}
              disabled={!selectedFieldId}
            >
              <Copy className="h-5 w-5" />
              <span className="text-[10px] font-medium">Duplicate</span>
            </Button>

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex flex-col h-auto pt-1.5 pb-1 gap-1 min-w-[64px] text-destructive disabled:opacity-30" 
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={!selectedFieldId}
              >
                <Trash2 className="h-5 w-5" />
                <span className="text-[10px] font-medium">Delete</span>
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Field?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the selected field? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      if (selectedFieldId) {
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
              disabled={!selectedFieldId}
            >
              <Settings2 className="h-5 w-5" />
              <span className="text-[10px] font-medium">Properties</span>
            </Button>
          </div>
        </div>

        {/* Right Panel */}
        <CursorArea id="settings" className="w-80 shrink-0 hidden lg:flex flex-col border-l border-border h-full bg-card overflow-hidden">
          <FieldSettings 
            currentUserId={currentUserId} 
            field={fields.find(f => f.id === selectedFieldId)}
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
          />
        </CursorArea>
      </div>

      {/* Mobile Component Panel */}
      <Sheet open={isComponentsOpen} onOpenChange={setIsComponentsOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Components</SheetTitle>
            <SheetDescription className="sr-only">
              Add new components to your form
            </SheetDescription>
          </SheetHeader>
          <ComponentPanel />
        </SheetContent>
      </Sheet>

      {/* Mobile Settings Panel */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="p-0 w-full sm:w-80">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Field Properties</SheetTitle>
            <SheetDescription className="sr-only">
              Edit the properties of the selected field
            </SheetDescription>
          </SheetHeader>
          <FieldSettings 
            currentUserId={currentUserId} 
            field={fields.find(f => f.id === selectedFieldId)}
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
          />
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
