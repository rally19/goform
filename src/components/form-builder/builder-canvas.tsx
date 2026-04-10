"use client";

import { useEffect, useCallback, useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { useFormBuilder } from "@/hooks/use-form-builder";
import { useFormRealtime, getInitials } from "@/hooks/use-form-realtime";
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
  closestCorners,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Save, Loader2, PlusCircle, Globe, Settings2, Palette, Check,
  Wifi, WifiOff, CheckCheck, ShieldAlert, ShieldCheck, Plus,
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
  currentUserId: string;
  canManageCollab: boolean;
}

// ─── Collaborator avatar stack ─────────────────────────────────────────────────
function CollaboratorAvatars() {
  const { collaborators } = useFormBuilder();
  if (collaborators.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center -space-x-2">
        {collaborators.slice(0, 4).map((c) => (
          <Tooltip key={c.presenceKey}>
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
              {c.selectedFieldId && (
                <span className="text-muted-foreground ml-1">(editing)</span>
              )}
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

export function BuilderCanvas({
  formId,
  initialForm,
  initialFields,
  currentUserId,
  canManageCollab,
}: BuilderCanvasProps) {
  const router = useRouter();
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
    collaborators,
    setIsCollabToggling,
    setIsDragging,
    lastChangeLocal,
  } = useFormBuilder();

  const dndId = useId();
  const [mounted, setMounted] = useState(false);
  const [togglingDirection, setTogglingDirection] = useState<"on" | "off" | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const [currentUserMeta, setCurrentUserMeta] = useState<{
    id: string;
    name: string;
    email: string;
  }>({ id: currentUserId, name: "User", email: "" });

  useEffect(() => {
    initialize(initialForm, initialFields);
    setMounted(true);

    import("@/lib/client").then(({ createClient }) => {
      createClient()
        .auth.getUser()
        .then(({ data }: any) => {
          if (data.user) {
            setCurrentUserMeta({
              id: data.user.id,
              name:
                data.user.user_metadata?.full_name ??
                data.user.email?.split("@")[0] ??
                "User",
              email: data.user.email ?? "",
            });
          }
        });
    });
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<Record<string, unknown> | null>(null);
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const collaborationEnabled = form?.collaborationEnabled ?? false;

  const { trackMyPresence, myColor, isSecondary, isReady, broadcastState, broadcastKick, broadcastCollabToggle } = useFormRealtime({
    formId,
    broadcastEnabled: collaborationEnabled,
    currentUser: currentUserMeta,
    onKicked: useCallback(() => {}, []),
  });

  const isAdmissionLocked = !collaborationEnabled && isSecondary;
  const activeLocker = collaborators[0];

  useEffect(() => {
    if (!activeId) {
      trackMyPresence({ selectedFieldId });
    } else {
      const dragFieldId = activeId.startsWith("new:") ? null : activeId;
      trackMyPresence({ selectedFieldId: dragFieldId });
    }
  }, [activeId, selectedFieldId, trackMyPresence]);

  const handleSave = useCallback(async () => {
    if (!form || isSaving) return false;
    setSaving(true);
    try {
      const [metaResult, fieldsResult] = await Promise.all([
        updateForm(formId, form),
        saveFormFields(formId, fields),
      ]);
      if (!metaResult.success) throw new Error(metaResult.error);
      if (!fieldsResult.success) throw new Error(fieldsResult.error);
      markSaved();
      if (!collaborationEnabled) toast.success("Form saved!");
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      return true;
    } catch (err) {
      toast.error("Failed to save: " + (err as Error).message);
      setSaving(false);
      return false;
    }
  }, [form, fields, formId, isSaving, collaborationEnabled, setSaving, markSaved]);

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
  }, [form, formId, updateFormMeta]);

  const handleCollabToggle = useCallback(async (enabled: boolean) => {
    if (!canManageCollab || !form) return;

    // 1. Immediately Deselect any active field
    selectField(null);
    
    // 2. Start Toggling State (shows overlay & locks real-time listener)
    setTogglingDirection(enabled ? "on" : "off");
    setIsCollabToggling(true);

    try {
      // 3. Instant Broadcast (Fast Path) - Lock everyone else immediately
      broadcastCollabToggle(enabled);

      // 4. GUARD: If currently saving or dirty, wait for a clean state first
      if (isSaving || isDirty) {
        // Trigger a save if dirty
        const saveSuccess = await handleSave();
        if (!saveSuccess && isDirty) {
          toast.error("Could not toggle collaboration because saving failed. Please try again.");
          return;
        }
      }

      // 5. Update local state
      updateFormMeta({ collaborationEnabled: enabled });

      // 6. DB Update
      const result = await updateForm(formId, { ...form, collaborationEnabled: enabled });
      if (!result.success) {
        toast.error("Failed to update collaboration setting");
        updateFormMeta({ collaborationEnabled: !enabled });
        // Re-broadcast the failure state
        broadcastCollabToggle(!enabled);
      } else {
        toast.success(enabled ? "Collaboration mode enabled" : "Collaboration mode disabled");
      }
    } catch (error) {
       toast.error("An error occurred during collaboration toggle");
    } finally {
      setTogglingDirection(null);
      setIsCollabToggling(false);
    }
  }, [canManageCollab, form, formId, updateFormMeta, broadcastCollabToggle, isSaving, isDirty, handleSave, selectField, setIsCollabToggling]);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isDirty || collaborationEnabled || !form?.autoSave) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(handleSave, 3000);
    return () => clearTimeout(saveTimeout.current);
  }, [isDirty, fields, form, handleSave, collaborationEnabled]);

  const collabSaveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    // ANTI-HURRICANE GUARD: Only broadcast if the change was made locally.
    // This stops infinite loops where Tab A broadcasts -> Tab B receives & updates -> Tab B re-broadcasts.
    if (!isDirty || !collaborationEnabled || !form || !lastChangeLocal) return;
    
    broadcastState(fields, form);
    clearTimeout(collabSaveTimeout.current);
    collabSaveTimeout.current = setTimeout(handleSave, 1500);
    return () => clearTimeout(collabSaveTimeout.current);
  }, [isDirty, fields, form, collaborationEnabled, broadcastState, handleSave, lastChangeLocal]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const { active } = event;
    setActiveId(active.id as string);
    setActiveData(active.data.current as Record<string, unknown>);
  };

  const handleDragOver = (event: any) => {};
  const handleDragCancel = () => {
    setIsDragging(false);
    setActiveId(null);
    setActiveData(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    setActiveId(null);
    setActiveData(null);

    if (!over) return;

    if (active.id.toString().startsWith("new:")) {
      const type = active.data.current?.type as FieldType;
      const overIdx = fields.findIndex((f) => f.id === over.id.toString());
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
      if (fromIdx >= 0 && toIdx >= 0) reorderFields(fromIdx, toIdx);
    }
  };

  const accentColor = form?.accentColor ?? "#6366f1";

  const renderOverlay = () => {
    if (!activeId) return null;
    if (activeId.startsWith("new:")) {
      const label = activeData?.label as string || "New Field";
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
          currentUserId={currentUserId}
        />
      );
    }
    return null;
  };

  if (!mounted) return null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {!isReady ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm h-full gap-4 animate-in fade-in duration-500">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <ShieldCheck className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-sm font-semibold text-foreground">Verifying Session</h3>
            <p className="text-xs text-muted-foreground">Connecting to real-time engine...</p>
          </div>
        </div>
      ) : (
        <div className="flex h-full overflow-hidden relative">
          {/* Left Panel */}
          <div className="w-56 shrink-0 hidden md:flex flex-col border-r border-border h-full min-h-0 bg-card">
            <ComponentPanel />
          </div>

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

          {/* Center Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Toolbar */}
            <div className="h-12 border-b border-border bg-card flex items-center justify-between px-2 md:px-4 shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={form?.status === "active" ? "default" : "secondary"}>
                  {form?.status ?? "draft"}
                </Badge>
                {collaborationEnabled ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCheck className="h-3 w-3 opacity-50"/>}
                    <span className="hidden sm:inline">{isSaving ? "Saving..." : "Real-time sync"}</span>
                  </span>
                ) : isDirty && (
                  <span className="text-xs text-muted-foreground">• Unsaved changes</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 md:gap-3">
                <div className="flex items-center gap-2 mr-1">
                   <div className="h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: myColor }}>
                     {getInitials(currentUserMeta.name)}
                   </div>
                   <CollaboratorAvatars />
                </div>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                          canManageCollab ? "hover:bg-muted cursor-pointer" : "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => canManageCollab && handleCollabToggle(!collaborationEnabled)}
                      >
                        {collaborationEnabled ? (
                          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium hidden sm:inline">
                          {collaborationEnabled ? "Collab ON" : "Collab OFF"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                       {canManageCollab ? "Toggle real-time collaboration" : "Collaboration mode managed by owner"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="w-px h-4 bg-border mx-1 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1.5" onClick={handlePublish}>
                    <Globe className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">{form?.status === "active" ? "Unpublish" : "Publish"}</span>
                  </Button>

                  <Button variant="default" size="sm" className="h-8 px-3 text-xs gap-1.5 shadow-sm" onClick={handleSave} disabled={!isDirty || isSaving}>
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Palette className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-2">
                      <div className="grid grid-cols-4 gap-2">
                        {ACCENT_COLORS.map((c) => (
                          <DropdownMenuItem
                            key={c.value}
                            className="relative h-8 w-8 rounded-full cursor-pointer p-0"
                            style={{ backgroundColor: c.value }}
                            onSelect={(e) => {
                              e.preventDefault();
                              updateFormMeta({ accentColor: c.value });
                            }}
                          >
                            {accentColor === c.value && <Check className="h-4 w-4 text-white" />}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Toggling Collaboration Mode Overlay */}
            {togglingDirection && (
              <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-sm bg-background/30 animate-in fade-in duration-300">
                <div className="bg-card/95 p-8 rounded-2xl shadow-2xl border border-border/50 flex flex-col items-center gap-4 max-w-sm text-center">
                  <div className="bg-primary/10 p-3 rounded-full animate-pulse">
                     <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {togglingDirection === "on" ? "Turning On Collaboration" : "Turning Off Collaboration"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Saving current state and updating session...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Canvas Content */}
            <ScrollArea className="flex-1 min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-full" onClick={() => selectField(null)}>
                <div className="max-w-2xl mx-auto space-y-4">
                  <FormHeaderEditor accentColor={accentColor} />
                  <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 min-h-[100px]">
                      {fields.map((field) => (
                        <FieldCard
                          key={field.id}
                          field={field}
                          isSelected={selectedFieldId === field.id}
                          accentColor={accentColor}
                          currentUserId={currentUserId}
                        />
                      ))}
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
          <div className="w-80 shrink-0 hidden lg:flex flex-col border-l border-border h-full bg-card overflow-hidden">
            <FieldSettings currentUserId={currentUserId} />
          </div>

          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetContent side="right" className="p-0 w-[90%] sm:w-80">
              <SheetHeader className="sr-only">
                <SheetTitle>Field Settings</SheetTitle>
              </SheetHeader>
              <div className="h-full">
                <FieldSettings currentUserId={currentUserId} onMobileClose={() => setIsSettingsOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Read-Only Overlay */}
          {isAdmissionLocked && (
            <div className="absolute inset-x-0 bottom-0 top-0 z-[60] flex items-center justify-center backdrop-blur-[2px] bg-background/40 animate-in fade-in duration-500">
              <div className="max-w-md w-full mx-4 bg-card border border-border shadow-2xl rounded-2xl p-8 text-center ring-1 ring-amber-500/10 flex flex-col items-center gap-4 text-pretty">
                <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-2">
                  <ShieldAlert className="h-8 w-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground font-heading">Read-Only Mode</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    This form is currently being edited by <span className="font-semibold text-foreground">{activeLocker?.name}</span>. 
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 text-balance">
                    Structural editing is restricted to the primary editor. You can still view results and analytics in the other sections.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-4">
                  <Button variant="outline" className="flex-1 text-xs h-9" asChild>
                    <Link href="/forms">Exit Editor</Link>
                  </Button>
                  <Button className="flex-1 text-xs h-9" asChild>
                    <Link href={`/forms/${formId}/results`}>View Results</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }) }}>
        {renderOverlay()}
      </DragOverlay>
    </DndContext>
  );
}
