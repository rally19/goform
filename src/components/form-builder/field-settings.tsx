"use client";

import { BuilderField, BuilderSection } from "@/lib/form-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GripVertical, Plus, Trash2, X,
  Settings2,
} from "lucide-react";
import { useFormBuilder } from "@/hooks/use-form-builder";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FieldSettingsProps {
  field?: BuilderField;
  onUpdate?: (changes: Partial<BuilderField>) => void;
  onAddOption?: () => void;
  onRemoveOption?: (idx: number) => void;
  onUpdateOption?: (idx: number, label: string) => void;
  onReorderOptions?: (from: number, to: number) => void;
  currentUserId: string;
  onMobileClose?: () => void;
  selectedSection?: BuilderSection;
  onUpdateSection?: (changes: Partial<BuilderSection>) => void;
}

export function FieldSettings({ 
  field,
  onUpdate,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onReorderOptions,
  currentUserId,
  onMobileClose,
  selectedSection,
  onUpdateSection,
}: FieldSettingsProps) {
  const { selectField, selectSection } = useFormBuilder();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  if (selectedSection && !field) {
    return (
      <div data-cursor-area-root="true" className="flex flex-col h-full bg-card min-h-0">
        <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Properties
            </h3>
            <Badge variant="secondary" className="text-[10px]">Section</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              selectSection(null);
              onMobileClose?.();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-5">
            <div className="space-y-3" data-cursor-id="section-basic-info">
              <div className="space-y-1.5" data-cursor-id="section-name" data-cursor-type="field">
                <Label className="text-xs font-medium">Section Name</Label>
                <Input
                  value={selectedSection.name ?? ""}
                  onChange={(e) => onUpdateSection?.({ name: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="Section name"
                />
              </div>
              <div className="space-y-1.5" data-cursor-id="section-description" data-cursor-type="field">
                <Label className="text-xs font-medium">Description (optional)</Label>
                <Textarea
                  value={selectedSection.description ?? ""}
                  onChange={(e) => onUpdateSection?.({ description: e.target.value })}
                  className="text-sm resize-none"
                  rows={2}
                  placeholder="Section description"
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (!field) {
    return (
      <div data-cursor-area-root="true" className="flex flex-col h-full bg-card min-h-0">
        <div className="p-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Properties
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No field selected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click a field on the canvas to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const hasOptions = ["radio", "checkbox", "select", "multi_select"].includes(field.type);
  const hasRating = field.type === "rating";
  const hasScale = field.type === "scale";
  const hasValidation = ["short_text", "long_text", "number", "email", "phone", "url"].includes(field.type);
  const hasRows = field.type === "long_text";
  const isLayout = ["section", "page_break"].includes(field.type);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const fieldOptions = field.options || [];
      const oldIndex = fieldOptions.findIndex((_, idx) => `opt-${idx}` === active.id);
      const newIndex = fieldOptions.findIndex((_, idx) => `opt-${idx}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderOptions?.(oldIndex, newIndex);
      }
    }
  };

  return (
    <div data-cursor-area-root="true" className="flex flex-col h-full bg-card min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Properties
          </h3>
          <Badge variant="secondary" className="text-[10px] capitalize">
            {field.type.replace(/_/g, " ")}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={() => {
            selectField(null);
            onMobileClose?.();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-5">
          {/* Basic info */}
          <div className="space-y-3" data-cursor-id="basic-info">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Label</Label>
              <Input
                value={field.label ?? ""}
                onChange={(e) => onUpdate?.({ label: e.target.value })}
                className="h-8 text-sm"
                placeholder="Question label"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description (optional)</Label>
              <Textarea
                value={field.description ?? ""}
                onChange={(e) => onUpdate?.({ description: e.target.value })}
                className="text-sm resize-none"
                rows={2}
                placeholder="Helper text for respondents"
              />
            </div>
          </div>

          {!isLayout && !["radio", "checkbox", "rating", "scale"].includes(field.type) && (
            <div className="space-y-1.5 pt-1.5">
              <Label className="text-xs font-medium">Placeholder</Label>
              <Input
                value={field.placeholder ?? ""}
                onChange={(e) => onUpdate?.({ placeholder: e.target.value })}
                className="h-8 text-sm"
                placeholder="e.g., Select an option..."
              />
            </div>
          )}

          {!isLayout && (
            <>
              <Separator />
              <div data-cursor-id="required-toggle" className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
                <div>
                  <p className="text-sm font-medium">Required</p>
                  <p className="text-xs text-muted-foreground">Force respondents to answer</p>
                </div>
                <Switch
                  checked={field.required}
                  onCheckedChange={(v) => onUpdate?.({ required: v })}
                />
              </div>
            </>
          )}

          {/* Options (for choice fields) */}
          {hasOptions && (
            <>
              <Separator />
              <div className="space-y-2" data-cursor-id="options-manager">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Options</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => onAddOption?.()}
                  >
                    <Plus className="h-3 w-3" />
                    Add Option
                  </Button>
                </div>
                
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={(field.options ?? []).map((_, i) => `opt-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {(field.options ?? []).map((opt, i) => (
                        <SortableOption 
                          key={`opt-${i}`}
                          id={`opt-${i}`}
                          idx={i}
                          label={opt.label}
                          onUpdate={onUpdateOption}
                          onRemove={onRemoveOption}
                          disabled={(field.options?.length ?? 0) <= 1}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </>
          )}

          {/* Other settings... Rating, Scale, Validation etc remain the same */}
          {hasRating && (
            <div className="space-y-3 pt-2" data-cursor-id="rating-settings">
              <Separator />
              <div className="flex justify-between items-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                 <span>Stars</span>
                 <span className="text-foreground">{field.properties?.stars ?? 5}</span>
              </div>
              <Slider
                min={3}
                max={10}
                step={1}
                value={[field.properties?.stars ?? 5]}
                onValueChange={([v]) =>
                  onUpdate?.({
                    properties: { ...(field.properties ?? {}), stars: v },
                  })
                }
              />
            </div>
          )}

          {hasScale && (
            <div className="space-y-3 pt-2" data-cursor-id="scale-settings">
              <Separator />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Scale Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Min</Label>
                  <Input
                    type="number"
                    value={field.properties?.scaleMin ?? 1}
                    onChange={(e) =>
                      onUpdate?.({
                        properties: { ...(field.properties ?? {}), scaleMin: Number(e.target.value) },
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Max</Label>
                  <Input
                    type="number"
                    value={field.properties?.scaleMax ?? 10}
                    onChange={(e) =>
                      onUpdate?.({
                        properties: { ...(field.properties ?? {}), scaleMax: Number(e.target.value) },
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          
          {hasValidation && (
            <div className="space-y-3 pt-2" data-cursor-id="validation-settings">
              <Separator />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Validation Rules</Label>
              {(field.type === "short_text" || field.type === "long_text") && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Min Length</Label>
                    <Input
                      type="number"
                      value={field.validation?.minLength ?? ""}
                      onChange={(e) =>
                        onUpdate?.({
                          validation: { ...(field.validation ?? {}), minLength: e.target.value ? Number(e.target.value) : undefined },
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Max Length</Label>
                    <Input
                      type="number"
                      value={field.validation?.maxLength ?? ""}
                      onChange={(e) =>
                        onUpdate?.({
                          validation: { ...(field.validation ?? {}), maxLength: e.target.value ? Number(e.target.value) : undefined },
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SortableOption({ 
  id, 
  idx, 
  label, 
  onUpdate, 
  onRemove, 
  disabled 
}: { 
  id: string; 
  idx: number; 
  label: string; 
  onUpdate?: (idx: number, label: string) => void;
  onRemove?: (idx: number) => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "flex items-center gap-1.5 group/opt transition-all",
        isDragging && "z-50 ring-2 ring-primary relative bg-background rounded-md shadow-lg"
      )}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="h-7 w-7 flex items-center justify-center text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing p-1 -m-1"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <Input
        value={label}
        onChange={(e) => onUpdate?.(idx, e.target.value)}
        className="h-7 text-sm flex-1 bg-transparent hover:bg-muted/30 focus:bg-background transition-colors"
        placeholder={`Option ${idx + 1}`}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground opacity-100 md:opacity-0 md:group-hover/opt:opacity-100 hover:text-destructive shrink-0 transition-opacity"
        onClick={() => onRemove?.(idx)}
        disabled={disabled}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
