"use client";

import { useEffect, useCallback, useState } from "react";
import { useFormBuilder } from "@/hooks/use-form-builder";
import { useFormCollaboration } from "@/hooks/use-form-collaboration";
import { FieldCard } from "./field-card";
import { FormHeaderEditor } from "./form-header-editor";
import { ComponentPanel } from "./component-panel";
import { FieldSettings } from "./field-settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DragStartEvent,
  DragEndEvent,
  closestCorners,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  PlusCircle, Globe, Settings2, Palette, Check,
  Link as LinkIcon, Plus, Loader2, CheckCheck
} from "lucide-react";
import { ACCENT_COLORS } from "@/lib/form-types";
import { motion, AnimatePresence } from "motion/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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

  // Localized cursor tracking is now handled by CursorArea wrappers

  const accentColor = form?.accentColor ?? "#6366f1";
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
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

    // Handle reordering
    if (active.id !== over.id && !String(active.id).startsWith("new:")) {
      const oldIdx = fields.findIndex((f) => f.id === active.id);
      const newIdx = fields.findIndex((f) => f.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        collabReorderFields(oldIdx, newIdx);
      }
    }
  };

  const updateStatus = async (status: "draft" | "active" | "closed") => {
    const res = await setFormStatus(formId, status);
    if (res.success) {
      collabUpdateFormMeta({ status });
      toast.success(`Form ${status}`);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  return (
    <DndContext
      sensors={sensors}
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
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 hidden sm:flex">
                    <Globe className="h-3.5 w-3.5" />
                    <span>Publish</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => updateStatus("active")} className="gap-2">
                    <CheckCheck className="h-4 w-4 text-emerald-500" />
                    Publish Form
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatus("draft")} className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Back to Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyLink} className="gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={copyLink}>
                <LinkIcon className="h-4 w-4" />
              </Button>

              <div className="w-px h-4 bg-border mx-1" />

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
          <ScrollArea className="flex-1 h-full min-h-0 bg-muted/30">
            <CursorArea id="canvas" className="min-h-full">
              <div data-cursor-area-root="true" className="max-w-2xl mx-auto p-4 md:p-8 space-y-8 pb-32">
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
                            layout
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
                              onUpdate={(changes) => collabUpdateField(field.id, changes)}
                              onRemove={() => collabRemoveField(field.id)}
                              onDuplicate={() => {
                                const copy = { ...field, id: crypto.randomUUID(), label: `${field.label} (Copy)`, isNew: true };
                                const idx = fields.findIndex(f => f.id === field.id);
                                collabAddField(copy, idx + 1);
                              }}
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
            </CursorArea>
          </ScrollArea>

          {/* Mobile Footer */}
          <div className="md:hidden h-14 border-t border-border bg-card flex items-center justify-around px-4 shrink-0">
            <Button variant="ghost" size="sm" className="flex flex-col h-auto pt-1 gap-1" onClick={() => setIsComponentsOpen(true)}>
              <Plus className="h-5 w-5" />
              <span className="text-[10px]">Add</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex flex-col h-auto pt-1 gap-1" onClick={() => setIsSettingsOpen(true)} disabled={!selectedFieldId}>
              <Settings2 className="h-5 w-5" />
              <span className="text-[10px]">Settings</span>
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
            onMobileClose={() => {}}
          />
        </CursorArea>
      </div>

      {/* Mobile Component Panel */}
      <Sheet open={isComponentsOpen} onOpenChange={setIsComponentsOpen}>
        <SheetContent side="left" className="p-0 w-80">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Components</SheetTitle>
          </SheetHeader>
          <ComponentPanel />
        </SheetContent>
      </Sheet>

      {/* Mobile Settings Panel */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="p-0 w-full sm:w-80">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Field Properties</SheetTitle>
          </SheetHeader>
          <FieldSettings 
            currentUserId={currentUserId} 
            field={fields.find(f => f.id === selectedFieldId)}
            onUpdate={(changes) => selectedFieldId && collabUpdateField(selectedFieldId, changes)}
            onAddOption={() => {}}
            onRemoveOption={() => {}}
            onUpdateOption={() => {}}
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
          <div className="w-[640px]">
            <FieldCard
              field={fields.find(f => f.id === activeId)!}
              accentColor={accentColor}
              currentUserId={currentUserId}
              isSelected
              isOverlay
              others={[]}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
