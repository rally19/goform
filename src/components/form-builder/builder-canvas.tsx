"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useFormBuilder } from "@/hooks/use-form-builder";
import { FieldCard } from "./field-card";
import { FormHeaderEditor } from "./form-header-editor";
import { ComponentPanel } from "./component-panel";
import { FieldSettings } from "./field-settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Save, Loader2, PlusCircle, Globe,
} from "lucide-react";
import Link from "next/link";
import { ACCENT_COLORS } from "@/lib/form-types";

interface BuilderCanvasProps {
  formId: string;
  initialForm: BuilderForm;
  initialFields: BuilderField[];
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
  } = useFormBuilder();

  // Initialize once
  useEffect(() => {
    initialize(initialForm, initialFields);
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<any>(null);

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

    // Case 1: Dragging from sidebar to canvas
    if (active.id.toString().startsWith("new:")) {
      const type = active.data.current?.type as FieldType;
      // Determine if dropping over a specific field or the canvas itself
      const overId = over.id.toString();
      const overIdx = fields.findIndex((f) => f.id === overId);
      
      // If dropped over a field, insert at that index
      // If dropped over the canvas (not a field), add to end
      addField(type, overIdx >= 0 ? overIdx : undefined);
      return;
    }

    // Case 2: Dragging from canvas to sidebar (remove)
    if (over.id === "component-panel") {
      removeField(active.id as string);
      toast.success("Field removed");
      return;
    }

    // Case 3: Reordering within canvas
    if (active.id !== over.id) {
      const fromIdx = fields.findIndex((f) => f.id === active.id);
      const toIdx = fields.findIndex((f) => f.id === over.id);
      if (fromIdx >= 0 && toIdx >= 0) {
        reorderFields(fromIdx, toIdx);
      }
    }
  };

  // Save handler
  const handleSave = useCallback(async () => {
    // ... same as before
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
      toast.success("Form saved!");
    } catch (err) {
      toast.error("Failed to save: " + (err as Error).message);
      setSaving(false);
    }
  }, [form, fields, formId, isSaving]);

  const handlePublish = useCallback(async () => {
    // ... same as before
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

  // Auto-save debounce
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isDirty || !form?.autoSave) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      handleSave();
    }, 3000);
    return () => clearTimeout(saveTimeout.current);
  }, [isDirty, fields, form, handleSave]);

  const accentColor = form?.accentColor ?? "#6366f1";

  // Overlay component helper
  const renderOverlay = () => {
    if (!activeId) return null;

    if (activeId.toString().startsWith("new:")) {
      const type = activeId.toString().split(":")[1];
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

  return (
    <DndContext
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
        {/* Left: Component Panel */}
        <div className="w-56 shrink-0 hidden md:flex flex-col border-r border-border h-full min-h-0">
          <ComponentPanel />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <Badge
                variant={form?.status === "active" ? "default" : "secondary"}
                className="capitalize"
              >
                {form?.status ?? "draft"}
              </Badge>
              {isDirty && (
                <span className="text-xs text-muted-foreground">• Unsaved changes</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  className={cn(
                    "h-4 w-4 rounded-full border-2 transition-transform hover:scale-110",
                    accentColor === c.value
                      ? "border-foreground scale-125"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                  onClick={() => updateFormMeta({ accentColor: c.value })}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="h-8"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5 hidden sm:inline">Save</span>
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                className="h-8"
                style={{ backgroundColor: accentColor, color: "white" }}
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                {form?.status === "active" ? "Unpublish" : "Publish"}
              </Button>
            </div>
          </div>

          {/* Canvas area */}
          <ScrollArea className="flex-1 min-h-0">
            <div
              className="min-h-full bg-muted/20 py-8 px-4"
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

        {/* Right: Field Settings */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col border-l border-border h-full min-h-0">
          <FieldSettings />
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
