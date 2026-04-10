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
  Wifi, WifiOff, CheckCheck, Lock, ShieldAlert,
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
  /** Server-resolved user id so we never need to fetch it client-side */
  currentUserId: string;
  /** True if this user is owner or administrator — can toggle collab + is never blocked */
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
  } = useFormBuilder();

  const dndId = useId();
  const [mounted, setMounted] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // ─── User info (from props, no extra fetch needed) ─────────────────────────
  // We still need name/email for presence — get them from Supabase auth client-side
  const [currentUserMeta, setCurrentUserMeta] = useState<{
    id: string;
    name: string;
    email: string;
  }>({ id: currentUserId, name: "User", email: "" });

  useEffect(() => {
    initialize(initialForm, initialFields);
    setMounted(true);

    // Fetch display name once
    import("@/lib/client").then(({ createClient }) => {
      createClient()
        .auth.getUser()
        .then(({ data }: { data: { user: import("@supabase/supabase-js").User | null } }) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<Record<string, unknown> | null>(null);
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const collaborationEnabled = form?.collaborationEnabled ?? false;

  // ─── "Blocked" state: collab OFF and someone else is already editing ──────
  const [isBlocked, setIsBlocked] = useState(false);

  // ─── Realtime hook — ALWAYS mounted (presence is always-on) ───────────────
  const { broadcastState, broadcastKick, trackMyPresence, myColor } = useFormRealtime({
    formId,
    broadcastEnabled: collaborationEnabled,
    currentUser: currentUserMeta,
    onKicked: useCallback(() => {
      toast.error("Collaboration mode was disabled. You have been redirected.", {
        duration: 5000,
      });
      router.push("/forms");
    }, [router]),
  });

  // ─── Determine "blocked" status ────────────────────────────────────────────
  // When collab is OFF, non-admins are blocked if anyone else is present.
  useEffect(() => {
    if (collaborationEnabled || canManageCollab) {
      setIsBlocked(false);
      return;
    }
    const othersPresent = collaborators.some((c) => c.userId !== currentUserId);
    setIsBlocked(othersPresent);
  }, [collaborators, collaborationEnabled, canManageCollab, currentUserId]);

  // ─── Track drag in presence ────────────────────────────────────────────────
  useEffect(() => {
    if (!activeId) {
      // Drag ended — restore normal selected field
      trackMyPresence({ selectedFieldId });
    } else {
      // Dragging a field or new component
      const dragFieldId = activeId.startsWith("new:") ? null : activeId;
      trackMyPresence({ selectedFieldId: dragFieldId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

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
      if (!collaborationEnabled) toast.success("Form saved!");
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

  // ─── Collaboration toggle (admin-only) ─────────────────────────────────────
  const handleCollabToggle = useCallback(async (enabled: boolean) => {
    if (!canManageCollab) return;
    updateFormMeta({ collaborationEnabled: enabled });

    if (!enabled) {
      // Kick all others before disabling
      broadcastKick();
    }

    const result = await updateForm(formId, { ...form!, collaborationEnabled: enabled });
    if (!result.success) {
      toast.error("Failed to update collaboration setting");
      updateFormMeta({ collaborationEnabled: !enabled }); // revert
    } else {
      toast.success(
        enabled ? "Collaboration mode enabled" : "Collaboration mode disabled — others have been redirected"
      );
    }
  }, [canManageCollab, form, formId, updateFormMeta, broadcastKick]);

  // ─── Auto-save: non-collab mode ────────────────────────────────────────────
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isDirty || collaborationEnabled || !form?.autoSave) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(handleSave, 3000);
    return () => clearTimeout(saveTimeout.current);
  }, [isDirty, fields, form, handleSave, collaborationEnabled]);

  // ─── Auto-save + broadcast: collab mode ───────────────────────────────────
  const collabSaveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isDirty || !collaborationEnabled || !form) return;
    broadcastState(fields, form);
    clearTimeout(collabSaveTimeout.current);
    collabSaveTimeout.current = setTimeout(handleSave, 1500);
    return () => clearTimeout(collabSaveTimeout.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, fields, form, collaborationEnabled]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveData(active.data.current as Record<string, unknown>);
  };

  const handleDragEnd = (event: DragEndEvent) => {
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

  // ─── Blocked overlay (collab OFF, someone else is editing) ────────────────
  if (isBlocked) {
    const editors = collaborators.filter((c) => c.userId !== currentUserId);
    return (
      <div className="flex flex-col h-full items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-xl p-8 text-center space-y-5">
          <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Form is being edited</h2>
            <p className="text-sm text-muted-foreground">
              Collaboration mode is <strong>off</strong>. Only one person can edit at a time.
            </p>
          </div>

          {/* Active editors */}
          <div className="flex flex-col gap-2">
            {editors.map((c) => (
              <div
                key={c.presenceKey}
                className="flex items-center gap-3 rounded-lg px-3 py-2 bg-muted"
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: c.color }}
                >
                  {getInitials(c.name)}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
                  editing
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Wait for them to finish, or ask an admin to enable collaboration mode.
          </p>
          <Button variant="outline" onClick={() => router.push("/forms")} className="w-full">
            Go back to Forms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      id={dndId}
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
          {/* ─── Toolbar ───────────────────────────────────────────── */}
          <div className="h-12 border-b border-border bg-card flex items-center justify-between px-2 md:px-4 shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge
                variant={form?.status === "active" ? "default" : "secondary"}
                className="capitalize shrink-0"
              >
                {form?.status ?? "draft"}
              </Badge>

              {/* Save status */}
              {collaborationEnabled ? (
                isSaving ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </span>
                ) : justSaved ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Saved</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
                    <CheckCheck className="h-3 w-3" />
                    <span className="hidden sm:inline">Auto-saving</span>
                  </span>
                )
              ) : (
                isDirty && (
                  <span className="text-xs text-muted-foreground">• Unsaved changes</span>
                )
              )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1.5 md:gap-2">
              {/* ─── Collaborator avatars (always shown when someone else is present) */}
              <div className="flex items-center gap-1.5">
                {/* My avatar */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shrink-0 cursor-default"
                        style={{ backgroundColor: myColor }}
                      >
                        {getInitials(currentUserMeta.name)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {currentUserMeta.name} (you)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <CollaboratorAvatars />
              </div>

              {/* ─── Collaboration toggle (admin/owner only) ── */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                        canManageCollab
                          ? "hover:bg-muted cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => canManageCollab && handleCollabToggle(!collaborationEnabled)}
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
                        onCheckedChange={(v) => canManageCollab && handleCollabToggle(v)}
                        disabled={!canManageCollab}
                        className="h-4 w-7 [&_span]:h-3 [&_span]:w-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[220px] text-center">
                    {!canManageCollab
                      ? "Only admins and owners can toggle collaboration mode"
                      : collaborationEnabled
                      ? "ON — changes sync in real-time. Click to disable."
                      : "OFF — enable to allow multiple users to edit simultaneously."}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* ─── Manual save (non-collab mode only) ────────── */}
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

          {/* ─── Canvas area ───────────────────────────────────────── */}
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
                        currentUserId={currentUserId}
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

        {/* Mobile FABs */}
        <div className="contents">
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

      <DragOverlay
        dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: "0.4" } },
          }),
        }}
      >
        {renderOverlay()}
      </DragOverlay>
    </DndContext>
  );
}
