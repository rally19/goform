import { useState } from "react";
import { RichText } from "@/components/ui/rich-text";
import { useFormBuilder } from "@/hooks/use-form-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { X, Settings2, Plus, GripVertical, Trash2, Video, Globe, FolderOpen } from "lucide-react";
import { BuilderField, BuilderSection, SECTION_TYPE_META, type SectionType } from "@/lib/form-types";
import { stripHtml } from "@/lib/sanitize";
import {
  Select as SelectPrimitive,
  SelectContent as SelectContentPrimitive,
  SelectItem as SelectItemPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
  SelectValue as SelectValuePrimitive,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AssetPicker } from "@/components/assets/asset-picker";

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
  sections?: BuilderSection[];
  workspaceId?: string;
  accentColor?: string;
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
  sections = [],
  workspaceId,
  accentColor,
}: FieldSettingsProps) {
  const { selectField, selectSection } = useFormBuilder();
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

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
                <RichText
                  value={selectedSection.name ?? ""}
                  onChange={(val) => onUpdateSection?.({ name: val })}
                  placeholder="Section name"
                  workspaceId={workspaceId}
                  minHeight="min-h-[32px]"
                  multiline={false}
                  allowImages={false}
                  accentColor={accentColor}
                />
              </div>
              <div className="space-y-1.5" data-cursor-id="section-description" data-cursor-type="field">
                <Label className="text-xs font-medium">Description (optional)</Label>
                <RichText
                  value={selectedSection.description ?? ""}
                  onChange={(val) => onUpdateSection?.({ description: val })}
                  placeholder="Section description"
                  workspaceId={workspaceId}
                  minHeight="min-h-[60px]"
                  accentColor={accentColor}
                />
              </div>
              <Separator />
              <div className="space-y-1.5" data-cursor-id="section-type" data-cursor-type="field">
                <Label className="text-xs font-medium">Section Type</Label>
                {selectedSection.type === "success" ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground">
                      Success Page
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Success pages cannot be changed to another type. Delete this section and create a new one if needed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <SelectPrimitive
                      value={selectedSection.type ?? "next"}
                      onValueChange={(v) => onUpdateSection?.({ type: v as SectionType })}
                    >
                      <SelectTriggerPrimitive className="h-9 text-sm">
                        <SelectValuePrimitive />
                      </SelectTriggerPrimitive>
                      <SelectContentPrimitive>
                        {SECTION_TYPE_META
                          .filter((m) => m.type !== "success")
                          .map((m) => (
                            <SelectItemPrimitive key={m.type} value={m.type}>
                              {m.label}
                            </SelectItemPrimitive>
                          ))}
                      </SelectContentPrimitive>
                    </SelectPrimitive>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {SECTION_TYPE_META.find((m) => m.type === (selectedSection.type ?? "next"))?.description}
                    </p>
                  </div>
                )}
              </div>
              {(selectedSection.type ?? "next") === "next" && (
                <>
                  <Separator />
                  <div className="space-y-1.5" data-cursor-id="section-destination" data-cursor-type="field">
                    <Label className="text-xs font-medium">Next Destination</Label>
                    <SelectPrimitive
                      value={selectedSection.nextSectionId || "__auto__"}
                      onValueChange={(v) => onUpdateSection?.({ nextSectionId: v })}
                    >
                      <SelectTriggerPrimitive className="h-9 text-sm">
                        <SelectValuePrimitive />
                      </SelectTriggerPrimitive>
                      <SelectContentPrimitive>
                        <SelectItemPrimitive value="__auto__">
                          Default (next section in order)
                        </SelectItemPrimitive>
                        {[...sections]
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .filter((s) => s.id !== selectedSection.id && s.type !== "success")
                          .map((s) => (
                            <SelectItemPrimitive key={s.id} value={s.id}>
                              {stripHtml(s.name) || "(untitled)"}
                            </SelectItemPrimitive>
                          ))}
                      </SelectContentPrimitive>
                    </SelectPrimitive>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Where the &ldquo;Next&rdquo; button takes the user. Logic rules can override this at runtime.
                    </p>
                  </div>
                </>
              )}
              {selectedSection.type === "submit" && (
                <>
                  <Separator />
                  <div className="space-y-1.5" data-cursor-id="section-destination" data-cursor-type="field">
                    <Label className="text-xs font-medium">Success Destination</Label>
                    <SelectPrimitive
                      value={selectedSection.nextSectionId || "__auto__"}
                      onValueChange={(v) => onUpdateSection?.({ nextSectionId: v })}
                    >
                      <SelectTriggerPrimitive className="h-9 text-sm">
                        <SelectValuePrimitive />
                      </SelectTriggerPrimitive>
                      <SelectContentPrimitive>
                        <SelectItemPrimitive value="__auto__">
                          {sections.some((s) => s.type === "success")
                            ? "Default (first success page in order)"
                            : "Default (form settings success page)"}
                        </SelectItemPrimitive>
                        {[...sections]
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .filter((s) => s.type === "success")
                          .map((s) => (
                            <SelectItemPrimitive key={s.id} value={s.id}>
                              {stripHtml(s.name) || "(untitled)"}
                            </SelectItemPrimitive>
                          ))}
                      </SelectContentPrimitive>
                    </SelectPrimitive>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {sections.some((s) => s.type === "success")
                        ? "Which success page to show after submission. Logic rules can override this at runtime."
                        : "No success sections exist yet. The form settings success page will be used."}
                    </p>
                  </div>
                </>
              )}
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

  const hasOptions = ["radio", "checkbox", "select", "multi_select", "radio_grid", "checkbox_grid"].includes(field.type);
  const isGrid = ["radio_grid", "checkbox_grid"].includes(field.type);
  const hasRating = field.type === "rating";
  const hasScale = field.type === "scale";
  const hasValidation = ["short_text", "long_text", "number", "email", "phone", "url"].includes(field.type);
  const hasRows = field.type === "long_text";
  const isLayout = ["section", "page_break", "paragraph", "divider", "video"].includes(field.type);
  const isFile = field.type === "file";
  const isVideo = field.type === "video";

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

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const cols = field.properties?.columns ?? [];
      const oldIndex = cols.findIndex((_, idx) => `col-${idx}` === active.id);
      const newIndex = cols.findIndex((_, idx) => `col-${idx}` === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...cols];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        onUpdate?.({
          properties: { ...(field.properties ?? {}), columns: reordered },
        });
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
              <RichText
                value={field.label ?? ""}
                onChange={(val) => onUpdate?.({ label: val })}
                placeholder="Question label"
                workspaceId={workspaceId}
                minHeight="min-h-[32px]"
                multiline={false}
                allowImages={false}
                accentColor={accentColor}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description (optional)</Label>
              <RichText
                value={field.description ?? ""}
                onChange={(val) => onUpdate?.({ description: val })}
                placeholder="Helper text for respondents"
                workspaceId={workspaceId}
                minHeight="min-h-[60px]"
                accentColor={accentColor}
              />
            </div>
          </div>

          {!isLayout && !["radio", "checkbox", "radio_grid", "checkbox_grid", "rating", "scale"].includes(field.type) && (
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

          {["paragraph", "divider", "video"].includes(field.type) && (
            <>
              <Separator />
              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
                <div>
                  <p className="text-sm font-medium">Hidden by default</p>
                  <p className="text-xs text-muted-foreground">
                    Starts hidden. Use a Logic rule to show it.
                  </p>
                </div>
                <Switch
                  checked={!!field.properties?.defaultHidden}
                  onCheckedChange={(v) =>
                    onUpdate?.({
                      properties: { ...(field.properties ?? {}), defaultHidden: v },
                    })
                  }
                />
              </div>
            </>
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

              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
                <div>
                  <p className="text-sm font-medium">Hidden by default</p>
                  <p className="text-xs text-muted-foreground">
                    Starts hidden. Use a Logic rule to show it.
                  </p>
                </div>
                <Switch
                  checked={!!field.properties?.defaultHidden}
                  onCheckedChange={(v) =>
                    onUpdate?.({
                      properties: { ...(field.properties ?? {}), defaultHidden: v },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
                <div>
                  <p className="text-sm font-medium">Disabled by default</p>
                  <p className="text-xs text-muted-foreground">
                    Starts read-only. Use a Logic rule to enable it.
                  </p>
                </div>
                <Switch
                  checked={!!field.properties?.defaultDisabled}
                  onCheckedChange={(v) =>
                    onUpdate?.({
                      properties: { ...(field.properties ?? {}), defaultDisabled: v },
                    })
                  }
                />
              </div>

              {["short_text", "long_text", "email", "phone", "url", "number"].includes(field.type) && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
                  <div>
                    <p className="text-sm font-medium">Masked by default</p>
                    <p className="text-xs text-muted-foreground">
                      Obscure input like a password. Use Logic to unmask.
                    </p>
                  </div>
                  <Switch
                    checked={!!field.properties?.defaultMasked}
                    onCheckedChange={(v) =>
                      onUpdate?.({
                        properties: { ...(field.properties ?? {}), defaultMasked: v },
                      })
                    }
                  />
                </div>
              )}

              <Separator />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Submission Behaviour</p>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
                <div>
                  <p className="text-sm font-medium">Omit when hidden</p>
                  <p className="text-xs text-muted-foreground">
                    Don&apos;t submit this field&apos;s value when it is hidden.
                  </p>
                </div>
                <Switch
                  checked={field.properties?.omitWhenHidden !== false}
                  onCheckedChange={(v) =>
                    onUpdate?.({
                      properties: { ...(field.properties ?? {}), omitWhenHidden: v },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
                <div>
                  <p className="text-sm font-medium">Omit when disabled</p>
                  <p className="text-xs text-muted-foreground">
                    Don&apos;t submit this field&apos;s value when it is disabled.
                  </p>
                </div>
                <Switch
                  checked={field.properties?.omitWhenDisabled !== false}
                  onCheckedChange={(v) =>
                    onUpdate?.({
                      properties: { ...(field.properties ?? {}), omitWhenDisabled: v },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
                <div>
                  <p className="text-sm font-medium">Omit when on a skipped section</p>
                  <p className="text-xs text-muted-foreground">
                    Don&apos;t submit this field&apos;s value when its section was skipped.
                  </p>
                </div>
                <Switch
                  checked={field.properties?.omitWhenSkipped !== false}
                  onCheckedChange={(v) =>
                    onUpdate?.({
                      properties: { ...(field.properties ?? {}), omitWhenSkipped: v },
                    })
                  }
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
                  <Label className="text-xs font-medium">{isGrid ? "Rows" : "Options"}</Label>
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
                          workspaceId={workspaceId}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </>
          )}

          {/* Columns (for grid fields) */}
          {isGrid && (
            <>
              <Separator />
              <div className="space-y-2" data-cursor-id="columns-manager">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Columns</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => {
                      const cols = field.properties?.columns ?? [];
                      const newIdx = cols.length + 1;
                      onUpdate?.({
                        properties: {
                          ...(field.properties ?? {}),
                          columns: [...cols, { label: `Column ${newIdx}`, value: `col_${newIdx}` }],
                        },
                      });
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Add Column
                  </Button>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleColumnDragEnd}
                >
                  <SortableContext
                    items={(field.properties?.columns ?? []).map((_, i) => `col-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {(field.properties?.columns ?? []).map((col, i) => (
                        <SortableColumn
                          key={`col-${i}`}
                          id={`col-${i}`}
                          idx={i}
                          label={col.label}
                          onUpdateLabel={(idx, label) => {
                            const cols = [...(field.properties?.columns ?? [])];
                            cols[idx] = { ...cols[idx], label };
                            onUpdate?.({
                              properties: { ...(field.properties ?? {}), columns: cols },
                            });
                          }}
                          onRemove={(idx) => {
                            const cols = (field.properties?.columns ?? []).filter((_, ci) => ci !== idx);
                            onUpdate?.({
                              properties: { ...(field.properties ?? {}), columns: cols },
                            });
                          }}
                          disabled={(field.properties?.columns?.length ?? 0) <= 1}
                          workspaceId={workspaceId}
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

          {isFile && (
            <div className="space-y-3 pt-2" data-cursor-id="file-settings">
              <Separator />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">File Upload Settings</Label>
              
              <div className="flex justify-between items-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                 <span>Maximum Files</span>
                 <span className="text-foreground">{field.properties?.maxFiles ?? 1}</span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[field.properties?.maxFiles ?? 1]}
                onValueChange={([v]) =>
                  onUpdate?.({
                    properties: { ...(field.properties ?? {}), maxFiles: v, allowMultiple: v > 1 },
                  })
                }
              />

              <div className="space-y-1.5 pt-3">
                <Label className="text-[10px] text-muted-foreground uppercase">Max File Size (KB)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  value={field.properties?.maxFileSize ?? 5000}
                  onChange={(e) =>
                    onUpdate?.({
                      properties: { ...(field.properties ?? {}), maxFileSize: Number(e.target.value) },
                    })
                  }
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Absolute maximum is 5000 KB (5 MB).</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Allowed File Types</Label>
                <Input
                  value={field.properties?.acceptedTypes ? (field.properties.acceptedTypes as string[]).join(", ") : ""}
                  onChange={(e) =>
                    onUpdate?.({
                      properties: { 
                        ...(field.properties ?? {}), 
                        acceptedTypes: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : undefined 
                      },
                    })
                  }
                  placeholder="e.g. image/*, .pdf"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {isVideo && (
            <div className="space-y-4 pt-2" data-cursor-id="video-settings">
              <Separator />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Video Content</Label>
              
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-md">
                <Button
                  variant={field.properties?.videoSource !== "asset" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[10px] gap-1.5"
                  onClick={() => onUpdate?.({ properties: { ...(field.properties ?? {}), videoSource: "url" } })}
                >
                  <Globe className="h-3 w-3" />
                  URL Link
                </Button>
                <Button
                  variant={field.properties?.videoSource === "asset" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-[10px] gap-1.5"
                  onClick={() => onUpdate?.({ properties: { ...(field.properties ?? {}), videoSource: "asset" } })}
                >
                  <FolderOpen className="h-3 w-3" />
                  Assets
                </Button>
              </div>

              {field.properties?.videoSource === "asset" ? (
                <div className="space-y-2">
                  <div 
                    className="aspect-video rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden relative group"
                    onClick={() => setAssetPickerOpen(true)}
                  >
                    {field.properties?.assetUrl ? (
                      <>
                        <video src={field.properties.assetUrl as string} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" size="sm" className="pointer-events-none">Change Video</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Video className="h-6 w-6 text-muted-foreground/40" />
                        <p className="text-[10px] text-muted-foreground">Click to select video</p>
                      </>
                    )}
                  </div>
                  {field.properties?.assetUrl && (
                    <p className="text-[10px] text-muted-foreground truncate px-1">
                      Source: {new URL(field.properties.assetUrl as string).pathname.split("/").pop()}
                    </p>
                  )}
                  <AssetPicker
                    open={assetPickerOpen}
                    onOpenChange={setAssetPickerOpen}
                    type="video"
                    workspaceId={workspaceId ?? ""}
                    onSelect={(url) => onUpdate?.({ properties: { ...(field.properties ?? {}), assetUrl: url } })}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Video URL</Label>
                  <Input
                    value={field.properties?.videoUrl as string ?? ""}
                    onChange={(e) => onUpdate?.({ properties: { ...(field.properties ?? {}), videoUrl: e.target.value } })}
                    placeholder="YouTube, Vimeo, or direct link..."
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Supports YouTube, Vimeo, and direct MP4/WebM links.</p>
                </div>
              )}

              <Separator />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display Settings</Label>
              
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Aspect Ratio</Label>
                <div className="grid grid-cols-3 gap-1">
                  {["16/9", "4/3", "1/1"].map((ratio) => (
                    <Button
                      key={ratio}
                      variant={field.properties?.aspectRatio === ratio ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => onUpdate?.({ properties: { ...(field.properties ?? {}), aspectRatio: ratio } })}
                    >
                      {ratio}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {[
                  { id: "autoplay", label: "Autoplay" },
                  { id: "loop", label: "Loop" },
                  { id: "controls", label: "Show Controls" },
                ].map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between">
                    <Label className="text-xs">{opt.label}</Label>
                    <Switch
                      checked={!!(field.properties as any)?.[opt.id]}
                      onCheckedChange={(v) => onUpdate?.({ 
                        properties: { ...(field.properties ?? {}), [opt.id]: v } 
                      })}
                    />
                  </div>
                ))}
              </div>
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
  disabled,
  workspaceId
}: { 
  id: string; 
  idx: number; 
  label: string; 
  onUpdate?: (idx: number, label: string) => void;
  onRemove?: (idx: number) => void;
  disabled: boolean;
  workspaceId?: string;
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
      <RichText
        value={label}
        onChange={(val) => onUpdate?.(idx, val)}
        placeholder={`Option ${idx + 1}`}
        workspaceId={workspaceId}
        className="flex-1"
        minHeight="min-h-[28px]"
        multiline={true}
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

function SortableColumn({
  id,
  idx,
  label,
  onUpdateLabel,
  onRemove,
  disabled,
  workspaceId,
}: {
  id: string;
  idx: number;
  label: string;
  onUpdateLabel: (idx: number, label: string) => void;
  onRemove: (idx: number) => void;
  disabled: boolean;
  workspaceId?: string;
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
        "flex items-center gap-1.5 group/col transition-all",
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
      <RichText
        value={label}
        onChange={(val) => onUpdateLabel(idx, val)}
        placeholder={`Column ${idx + 1}`}
        workspaceId={workspaceId}
        className="flex-1"
        minHeight="min-h-[28px]"
        multiline={true}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground opacity-100 md:opacity-0 md:group-hover/col:opacity-100 hover:text-destructive shrink-0 transition-opacity"
        onClick={() => onRemove(idx)}
        disabled={disabled}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
