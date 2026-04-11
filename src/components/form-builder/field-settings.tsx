"use client";

import type { BuilderField } from "@/lib/form-types";
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

interface FieldSettingsProps {
  field?: BuilderField;
  onUpdate?: (changes: Partial<BuilderField>) => void;
  onAddOption?: () => void;
  onRemoveOption?: (idx: number) => void;
  onUpdateOption?: (idx: number, label: string) => void;
  onReorderOptions?: (from: number, to: number) => void;
  currentUserId: string;
  onMobileClose?: () => void;
}

export function FieldSettings({ 
  field,
  onUpdate,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onReorderOptions,
  currentUserId,
  onMobileClose 
}: FieldSettingsProps) {
  const { selectField } = useFormBuilder();

  if (!field) {
    return (
      <div className="flex flex-col h-full bg-card min-h-0">
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

  return (
    <div className="flex flex-col h-full bg-card min-h-0">
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
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Label</Label>
              <Input
                value={field.label}
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
            {!isLayout && field.type !== "rating" && field.type !== "scale" && !hasOptions && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Placeholder</Label>
                <Input
                  value={field.placeholder ?? ""}
                  onChange={(e) => onUpdate?.({ placeholder: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="e.g., Enter your answer"
                />
              </div>
            )}
          </div>

          {!isLayout && (
            <>
              <Separator />
              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background/50">
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
              <div className="space-y-2">
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
                <div className="space-y-1.5">
                  {(field.options ?? []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      <Input
                        value={opt.label}
                        onChange={(e) => onUpdateOption?.(i, e.target.value)}
                        className="h-7 text-sm flex-1"
                        placeholder={`Option ${i + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => onRemoveOption?.(i)}
                        disabled={(field.options?.length ?? 0) <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Star Rating config */}
          {hasRating && (
            <>
              <Separator />
              <div className="space-y-3">
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
            </>
          )}

          {/* Linear Scale config */}
          {hasScale && (
            <>
              <Separator />
              <div className="space-y-3">
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
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Min Label</Label>
                  <Input
                    value={field.properties?.scaleMinLabel ?? ""}
                    onChange={(e) =>
                      onUpdate?.({
                        properties: { ...(field.properties ?? {}), scaleMinLabel: e.target.value },
                      })
                    }
                    className="h-8 text-sm"
                    placeholder="e.g., Not likely"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Max Label</Label>
                  <Input
                    value={field.properties?.scaleMaxLabel ?? ""}
                    onChange={(e) =>
                      onUpdate?.({
                        properties: { ...(field.properties ?? {}), scaleMaxLabel: e.target.value },
                      })
                    }
                    className="h-8 text-sm"
                    placeholder="e.g., Very likely"
                  />
                </div>
              </div>
            </>
          )}

          {/* Textarea rows */}
          {hasRows && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                   <span>Visible Rows</span>
                   <span className="text-foreground">{field.properties?.rows ?? 4}</span>
                </div>
                <Slider
                  min={2}
                  max={12}
                  step={1}
                  value={[field.properties?.rows ?? 4]}
                  onValueChange={([v]) =>
                    onUpdate?.({
                      properties: { ...(field.properties ?? {}), rows: v },
                    })
                  }
                />
              </div>
            </>
          )}

          {/* Validation */}
          {hasValidation && (
            <>
              <Separator />
              <div className="space-y-3">
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
                        placeholder="—"
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
                        placeholder="—"
                      />
                    </div>
                  </div>
                )}
                {field.type === "number" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground uppercase">Min Value</Label>
                      <Input
                        type="number"
                        value={field.validation?.min ?? ""}
                        onChange={(e) =>
                          onUpdate?.({
                            validation: { ...(field.validation ?? {}), min: e.target.value ? Number(e.target.value) : undefined },
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="—"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground uppercase">Max Value</Label>
                      <Input
                        type="number"
                        value={field.validation?.max ?? ""}
                        onChange={(e) =>
                          onUpdate?.({
                            validation: { ...(field.validation ?? {}), max: e.target.value ? Number(e.target.value) : undefined },
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="—"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
