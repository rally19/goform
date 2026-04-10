"use client";

import { useFormBuilder } from "@/hooks/use-form-builder";
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
  Settings2, ChevronDown, Lock,
} from "lucide-react";
import { getInitials } from "@/hooks/use-form-realtime";

export function FieldSettings({ 
  currentUserId,
  onMobileClose 
}: { 
  currentUserId: string;
  onMobileClose?: () => void;
}) {
  const {
    fields,
    selectedFieldId,
    selectField,
    updateField,
    addOption,
    removeOption,
    updateOption,
    fieldLocks,
    form,
  } = useFormBuilder();

  const field = fields.find((f) => f.id === selectedFieldId);
  const collaborationEnabled = form?.collaborationEnabled ?? false;
  
  // Consistently check both session-based locks and persistent DB-based locks (Fast-Path ready)
  const sessionLocker = field && collaborationEnabled ? fieldLocks[field.id] : undefined;
  // If there's a DB lock but no session locker yet, it still counts as locked if it's not us
  const isLockedByOther = !!sessionLocker || (!!field?.lockedBy && field.lockedBy !== currentUserId);
  const locker = sessionLocker; 

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
      <div className="flex items-center justify-between p-3 border-b border-border">
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

      {/* Lock overlay when another user is editing */}
      {isLockedByOther && locker && (
        <div
          className="mx-3 mt-3 rounded-lg p-3 flex items-center gap-2.5 text-white text-sm font-medium"
          style={{ backgroundColor: locker.color }}
        >
          <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xs font-bold">
            {getInitials(locker.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{locker.name}</p>
            <p className="text-xs opacity-80">is editing this field</p>
          </div>
          <Lock className="h-4 w-4 shrink-0 ml-auto" />
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className={cn("p-4 space-y-5", isLockedByOther && "pointer-events-none opacity-50")}>
          {/* Basic info */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Label</Label>
              <Input
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                className="h-8 text-sm"
                placeholder="Question label"
                disabled={isLockedByOther}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description (optional)</Label>
              <Textarea
                value={field.description ?? ""}
                onChange={(e) => updateField(field.id, { description: e.target.value })}
                className="text-sm resize-none"
                rows={2}
                placeholder="Helper text for respondents"
                disabled={isLockedByOther}
              />
            </div>
            {!isLayout && field.type !== "rating" && field.type !== "scale" && !hasOptions && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Placeholder</Label>
                <Input
                  value={field.placeholder ?? ""}
                  onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="e.g., Enter your answer"
                  disabled={isLockedByOther}
                />
              </div>
            )}
          </div>

          {!isLayout && (
            <>
              <Separator />
              {/* Required toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-background">
                <div>
                  <p className="text-sm font-medium">Required</p>
                  <p className="text-xs text-muted-foreground">Respondents must answer this question</p>
                </div>
                <Switch
                  checked={field.required}
                  onCheckedChange={(v) => updateField(field.id, { required: v })}
                  disabled={isLockedByOther}
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
                    className="h-6 text-xs"
                    onClick={() => addOption(field.id)}
                    disabled={isLockedByOther}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {(field.options ?? []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab shrink-0" />
                      <Input
                        value={opt.label}
                        onChange={(e) => updateOption(field.id, i, e.target.value)}
                        className="h-7 text-sm flex-1"
                        placeholder={`Option ${i + 1}`}
                        disabled={isLockedByOther}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeOption(field.id, i)}
                        disabled={(field.options?.length ?? 0) <= 1 || isLockedByOther}
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
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Number of Stars: {field.properties?.stars ?? 5}
                </Label>
                <Slider
                  min={3}
                  max={10}
                  step={1}
                  value={[field.properties?.stars ?? 5]}
                  onValueChange={([v]) =>
                    updateField(field.id, {
                      properties: { ...(field.properties ?? {}), stars: v },
                    })
                  }
                  disabled={isLockedByOther}
                />
              </div>
            </>
          )}

          {/* Linear Scale config */}
          {hasScale && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Min</Label>
                    <Input
                      type="number"
                      value={field.properties?.scaleMin ?? 1}
                      onChange={(e) =>
                        updateField(field.id, {
                          properties: { ...(field.properties ?? {}), scaleMin: Number(e.target.value) },
                        })
                      }
                      className="h-8 text-sm"
                      disabled={isLockedByOther}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Max</Label>
                    <Input
                      type="number"
                      value={field.properties?.scaleMax ?? 10}
                      onChange={(e) =>
                        updateField(field.id, {
                          properties: { ...(field.properties ?? {}), scaleMax: Number(e.target.value) },
                        })
                      }
                      className="h-8 text-sm"
                      disabled={isLockedByOther}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Min Label</Label>
                  <Input
                    value={field.properties?.scaleMinLabel ?? ""}
                    onChange={(e) =>
                      updateField(field.id, {
                        properties: { ...(field.properties ?? {}), scaleMinLabel: e.target.value },
                      })
                    }
                    className="h-8 text-sm"
                    placeholder="e.g., Not likely"
                    disabled={isLockedByOther}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Max Label</Label>
                  <Input
                    value={field.properties?.scaleMaxLabel ?? ""}
                    onChange={(e) =>
                      updateField(field.id, {
                        properties: { ...(field.properties ?? {}), scaleMaxLabel: e.target.value },
                      })
                    }
                    className="h-8 text-sm"
                    placeholder="e.g., Very likely"
                    disabled={isLockedByOther}
                  />
                </div>
              </div>
            </>
          )}

          {/* Textarea rows */}
          {hasRows && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Rows: {field.properties?.rows ?? 4}
                </Label>
                <Slider
                  min={2}
                  max={12}
                  step={1}
                  value={[field.properties?.rows ?? 4]}
                  onValueChange={([v]) =>
                    updateField(field.id, {
                      properties: { ...(field.properties ?? {}), rows: v },
                    })
                  }
                  disabled={isLockedByOther}
                />
              </div>
            </>
          )}

          {/* Validation */}
          {hasValidation && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider">Validation</Label>
                {(field.type === "short_text" || field.type === "long_text") && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Min Length</Label>
                      <Input
                        type="number"
                        value={field.validation?.minLength ?? ""}
                        onChange={(e) =>
                          updateField(field.id, {
                            validation: { ...(field.validation ?? {}), minLength: e.target.value ? Number(e.target.value) : undefined },
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="—"
                        disabled={isLockedByOther}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Max Length</Label>
                      <Input
                        type="number"
                        value={field.validation?.maxLength ?? ""}
                        onChange={(e) =>
                          updateField(field.id, {
                            validation: { ...(field.validation ?? {}), maxLength: e.target.value ? Number(e.target.value) : undefined },
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="—"
                        disabled={isLockedByOther}
                      />
                    </div>
                  </div>
                )}
                {field.type === "number" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        type="number"
                        value={field.validation?.min ?? ""}
                        onChange={(e) =>
                          updateField(field.id, {
                            validation: { ...(field.validation ?? {}), min: e.target.value ? Number(e.target.value) : undefined },
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="—"
                        disabled={isLockedByOther}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        type="number"
                        value={field.validation?.max ?? ""}
                        onChange={(e) =>
                          updateField(field.id, {
                            validation: { ...(field.validation ?? {}), max: e.target.value ? Number(e.target.value) : undefined },
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="—"
                        disabled={isLockedByOther}
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
