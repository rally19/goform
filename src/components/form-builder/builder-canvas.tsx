"use client";

import { useEffect, useCallback, useRef, useState, useId } from "react";
import { useFormBuilder } from "@/hooks/use-form-builder";
import { useFormRealtime, getInitials, pickColor } from "@/hooks/use-form-realtime";
import { createClient } from "@/lib/client";
import { FieldCard } from "./field-card";
import { FormHeaderEditor } from "./form-header-editor";
import { ComponentPanel } from "./component-panel";
import { FieldSettings } from "./field-settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { BuilderField, BuilderForm, FieldType } from "@/lib/form-types";
import { saveFormFields, updateForm, setFormStatus } from "@/lib/actions/forms";
import { toast } from "sonner";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Save, Loader2, PlusCircle, Globe, Settings2, Palette, Check,
  Users, Wifi, WifiOff, CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { ACCENT_COLORS } from "@/lib/form-types";
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

interface BuilderCanvasProps {
  formId: string;
  initialForm: BuilderForm;
  initialFields: BuilderField[];
}

// ─── Collaborator avatar stack ─────────────────────────────────────────────────
function CollaboratorAvatars() {
  const { collaborators } = useFormBuilder();
  if (collaborators.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center -space-x-2">
        {collaborators.slice(0, 4).map((c) => (
          <Tooltip key={c.userId}>
            <TooltipTrigger asChild>
              <div
                className="h-7 w-7 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-white shrink-0 cursor-default"
                style={{ backgroundColor: c.color }}
              >
                {getInitials(c.name)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {c.name}
              {c.selectedFieldId && <span className="text-muted-foreground ml-1">(editing)</span>}
            </TooltipContent>
          </Tooltip>
        ))}
        {collaborators.length > 4 && (
          <div className="h-7 w-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
            +{collaborators.length - 4}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export function BuilderCanvas({ formId, initialForm, initialFields }: BuilderCanvasProps) {
  const {
    form,
    fields,
    selectedFieldId,
    isDirty,
    isSaving,
    initialize,
    reorderFields,
    addField,
    removeField,
    selectField,
    setSaving,
    markSaved,
    updateFormMeta,
    fieldLocks,
  } = useFormBuilder();

  const id = useId();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // ─── Saved indicator state ─────────────────────────────────────────────────
  const [justSaved, setJustSaved] = useState(false);

  // Initialize once
  useEffect(() => {
    initialize(initialForm, initialFields);
    setMounted(true);
  }, []);

  // Fetch current user for presence
  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await createClient().auth.getUser();
      if (authUser) {
        setCurrentUser({
          id: authUser.id,
          name:
            authUser.user_metadata?.full_name ??
            authUser.email?.split("@")[0] ??
            "User",
          email: authUser.email ?? "",
        });
      }
    })();
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<any>(null);
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const collaborationEnabled = form?.collaborationEnabled ?? false;

  // ─── Realtime integration ───────────────────────────────────────────────────
  const { broadcastState, myColor } = useFormRealtime({
    formId,
    enabled: collaborationEnabled && !!currentUser,
    currentUser: currentUser ?? { id: "anon", name: "User", email: "" },
    onBroadcastState: () => {
      if (form) broadcastState(fields, form);
    },
  });

  // ─── Save handler ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!form || isSaving) return;
    setSaving(true);
    try {
      const [metaResult, fieldsResult] = await Promise.all([
        updateForm(formId, form),
        saveFormFields(formId, fields),
      ]);
      if (!metaResult.success) throw new Error(metaResult.error);
      if (!fieldsResult.success) throw new Error(fieldsResult.error);
      markSaved();
      if (!collaborationEnabled) {
        toast.success("Form saved!");
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      toast.error("Failed to save: " + (err as Error).message);
      setSaving(false);
    }
  }, [form, fields, formId, isSaving, collaborationEnabled]);

  const handlePublish = useCallback(async () => {
    if (!form) return;
    const newStatus = form.status === "active" ? "draft" : "active";
    const result = await setFormStatus(formId, newStatus);
    if (result.success) {
      updateFormMeta({ status: newStatus });
      toast.success(newStatus === "active" ? "Form published!" : "Form unpublished");
    } else {
      toast.error(result.error ?? "Failed to update status");
    }
  }, [form, formId]);

  // ─── Collaboration toggle ───────────────────────────────────────────────────
  const handleCollabToggle = useCallback(async (enabled: boolean) => {
    updateFormMeta({ collaborationEnabled: enabled });
    // Persist immediately
    const result = await updateForm(formId, { ...form!, collaborationEnabled: enabled });
    if (!result.success) {
      toast.error("Failed to update collaboration setting");
      updateFormMeta({ collaborationEnabled: !enabled }); // revert
    } else {
      toast.success(enabled ? "Collaboration mode enabled" : "Collaboration mode disabled");
    }
  }, [form, formId, updateFormMeta]);

  // ─── Auto-save: manual / default autosave (non-collab mode) ───────────────
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isDirty || collaborationEnabled) return;
    if (!form?.autoSave) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      handleSave();
    }, 3000);
    return () => clearTimeout(saveTimeout.current);
  }, [isDirty, fields, form, handleSave, collaborationEnabled]);

  // ─── Auto-save: collaboration mode (instant broadcast + debounce save) ─────
  const collabSaveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isDirty || !collaborationEnabled || !form) return;

    // Instantly broadcast to peers
    broadcastState(fields, form);

    // Debounce persist to DB (1.5s)
    clearTimeout(collabSaveTimeout.current);
    collabSaveTimeout.current = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(collabSaveTimeout.current);
  }, [isDirty, fields, form, collaborationEnabled]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveData(active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveData(null);

    if (!over) return;

    if (active.id.toString().startsWith("new:")) {
      const type = active.data.current?.type as FieldType;
      const overId = over.id.toString();
      const overIdx = fields.findIndex((f) => f.id === overId);
      addField(type, overIdx >= 0 ? overIdx : undefined);
      return;
    }

    if (over.id === "component-panel") {
      removeField(active.id as string);
      toast.success("Field removed");
      return;
    }

    if (active.id !== over.id) {
      const fromIdx = fields.findIndex((f) => f.id === active.id);
      const toIdx = fields.findIndex((f) => f.id === over.id);
      if (fromIdx >= 0 && toIdx >= 0) {
        reorderFields(fromIdx, toIdx);
      }
    }
  };

  const accentColor = form?.accentColor ?? "#6366f1";

  const renderOverlay = () => {
    if (!activeId) return null;

    if (activeId.toString().startsWith("new:")) {
      const label = activeData?.label || "New Field";
      return (
        <div className="bg-card border-2 border-primary rounded-xl p-4 shadow-2xl opacity-90 w-72 flex items-center gap-3">
          <PlusCircle className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">Adding {label}...</span>
        </div>
      );
    }

    const field = fields.find((f) => f.id === activeId);
    if (field) {
      return (
        <FieldCard
          field={field}
          isSelected={selectedFieldId === activeId}
          accentColor={accentColor}
          isOverlay
        />
      );
    }

    return null;
  };

  if (!mounted) return null;

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setActiveData(null);
      }}
    >
      <div className="flex h-full overflow-hidden">
        {/* Left: Component Panel (Desktop) */}
        <div className="w-56 shrink-0 hidden md:flex flex-col border-r border-border h-full min-h-0">
          <ComponentPanel />
        </div>

        {/* Left: Component Panel (Mobile Sheet) */}
        <Sheet open={isComponentsOpen} onOpenChange={setIsComponentsOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Components</SheetTitle>
            </SheetHeader>
            <div className="h-full">
              <ComponentPanel />
            </div>
          </SheetContent>
        </Sheet>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="h-12 border-b border-border bg-card flex items-center justify-between px-2 md:px-4 shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge
                variant={form?.status === "active" ? "default" : "secondary"}
                className="capitalize shrink-0"
              >
                {form?.status ?? "draft"}
              </Badge>

              {/* Save status indicator */}
              {collaborationEnabled ? (
                <div className="flex items-center gap-1.5">
                  {isSaving ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                    </span>
                  ) : justSaved ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Saved</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                      <CheckCheck className="h-3 w-3" />
                      <span className="hidden sm:inline">Auto-saving</span>
                    </span>
                  )}
                </div>
              ) : (
                isDirty && (
                  <span className="text-xs text-muted-foreground">• Unsaved changes</span>
                )
              )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1.5 md:gap-2">
              {/* Collaborator avatars */}
              {collaborationEnabled && currentUser && (
                <div className="flex items-center gap-2">
                  {/* My own avatar */}
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="h-7 w-7 rounded-full border-2 border-primary/30 flex items-center justify-center text-[10px] font-bold text-white shrink-0 cursor-default ring-2 ring-offset-1"
                          style={{ backgroundColor: myColor }}
                        >
                          {getInitials(currentUser.name)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {currentUser.name} (you)
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <CollaboratorAvatars />
                </div>
              )}

              {/* Collab toggle */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleCollabToggle(!collaborationEnabled)}
                    >
                      {collaborationEnabled ? (
                        <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium hidden sm:inline">
                        {collaborationEnabled ? "Live" : "Collab"}
                      </span>
                      <Switch
                        checked={collaborationEnabled}
                        onCheckedChange={handleCollabToggle}
                        className="h-4 w-7 [&_span]:h-3 [&_span]:w-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[200px] text-center">
                    {collaborationEnabled
                      ? "Collaboration is ON — changes auto-save and sync in real-time"
                      : "Enable collaboration for real-time multi-user editing"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Manual save (only in non-collab mode) */}
              {!collaborationEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !isDirty}
                  className="h-8"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : justSaved ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Save</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={handlePublish}
                className="h-8"
                style={{ backgroundColor: accentColor, color: "white" }}
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                {form?.status === "active" ? "Unpublish" : "Publish"}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                    <Palette className="h-4 w-4" />
                    <span className="sr-only">Change accent color</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-48 p-2">
                  <div className="grid grid-cols-4 gap-2">
                    {ACCENT_COLORS.map((c) => (
                      <DropdownMenuItem
                        key={c.value}
                        className={cn(
                          "relative h-8 w-8 rounded-full cursor-pointer p-0 flex items-center justify-center transition-transform hover:scale-110 focus:ring-2 focus:ring-ring",
                          accentColor === c.value && "ring-2 ring-ring ring-offset-2"
                        )}
                        style={{ backgroundColor: c.value }}
                        onSelect={(e) => {
                          e.preventDefault();
                          updateFormMeta({ accentColor: c.value });
                        }}
                        title={c.label}
                      >
                        {accentColor === c.value && (
                          <Check className="h-4 w-4 text-white drop-shadow-sm" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Canvas area */}
          <ScrollArea className="flex-1 min-h-0">
            <div
              className="min-h-full bg-muted/20 pb-24 md:pb-8 pt-6 md:pt-8 px-2 md:px-4"
              onClick={() => selectField(null)}
            >
              <div className="max-w-2xl mx-auto space-y-4">
                <FormHeaderEditor accentColor={accentColor} />

                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 min-h-[100px]">
                    {fields.map((field) => (
                      <FieldCard
                        key={field.id}
                        field={field}
                        isSelected={selectedFieldId === field.id}
                        accentColor={accentColor}
                      />
                    ))}
                  </div>
                </SortableContext>

                {fields.length === 0 && (
                  <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 text-center">
                    <PlusCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Start building your form</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Drag components from the left panel or click to add
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right: Field Settings (Desktop) */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col border-l border-border h-full min-h-0">
          <FieldSettings />
        </div>

        {/* Right: Field Settings (Mobile Sheet) */}
        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <SheetContent side="right" className="p-0 w-80">
            <SheetHeader className="sr-only">
              <SheetTitle>Field Properties</SheetTitle>
            </SheetHeader>
            <div className="h-full">
              <FieldSettings />
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Floating Action Buttons */}
        <div className="contents">
          {/* Bottom Left: Add Components */}
          <div className="fixed bottom-6 left-6 z-40 md:hidden">
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-2xl transition-transform active:scale-95"
              style={{ backgroundColor: accentColor, color: "white" }}
              onClick={() => setIsComponentsOpen(true)}
            >
              <PlusCircle className="h-6 w-6" />
            </Button>
          </div>

          {/* Bottom Right: Field Properties */}
          <div className="fixed bottom-6 right-6 z-40 lg:hidden">
            <Button
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full shadow-2xl transition-all active:scale-95",
                !selectedFieldId && "opacity-0 pointer-events-none translate-y-20"
              )}
              style={selectedFieldId ? { backgroundColor: accentColor, color: "white" } : {}}
              onClick={() => setIsSettingsOpen(true)}
              disabled={!selectedFieldId}
            >
              <Settings2 className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: "0.4",
            },
          },
        }),
      }}>
        {renderOverlay()}
      </DragOverlay>
    </DndContext>
  );
}
