"use client";

import type {
  BuilderField,
  BuilderSection,
  LogicAction,
  LogicRule,
  LogicRuleAction,
  LogicValueSource,
  FormAnswer,
} from "@/lib/form-types";
import { LOGIC_ACTION_META } from "@/lib/form-types";
import { actionNeedsTargets, createEmptyRuleAction, migrateRule } from "@/lib/form-logic";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FieldPicker, FieldMultiPicker } from "./field-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ValueInput } from "./value-input";
import { ConditionBuilder } from "./condition-builder";
import {
  Trash2, Copy, ChevronDown, ChevronRight, Plus,
  AlertTriangle, Eye, EyeOff, Lock, Unlock, Asterisk, AsteriskSquare,
  Link2, Calculator, SkipForward, MousePointer2, Hash, ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/sanitize";
import type { LogicIssue } from "@/lib/form-logic";

const ACTION_ICONS: Record<LogicAction, React.ElementType> = {
  show_field: Eye,
  hide_field: EyeOff,
  enable_field: Unlock,
  disable_field: Lock,
  require_field: Asterisk,
  unrequire_field: AsteriskSquare,
  mask_field: Lock,
  unmask_field: Unlock,
  set_value: Calculator,
  skip_to_page: SkipForward,
  skip_to_section: SkipForward,
  jump_to_field: MousePointer2,
  redirect_to_url: ExternalLink,
};

const ACTION_COLORS: Record<LogicAction, string> = {
  show_field: "bg-green-500/15 text-green-600 dark:text-green-400",
  hide_field: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  enable_field: "bg-green-500/15 text-green-600 dark:text-green-400",
  disable_field: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  require_field: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  unrequire_field: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  mask_field: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  unmask_field: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  set_value: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  skip_to_page: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  skip_to_section: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  jump_to_field: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  redirect_to_url: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
};

interface RuleCardProps {
  rule: LogicRule;
  fields: BuilderField[];
  sections: BuilderSection[];
  issues: LogicIssue[];
  index: number;
  totalRules: number;
  defaultExpanded?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onChange: (patch: Partial<LogicRule>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: "up" | "down") => void;
}

export function RuleCard({
  rule: rawRule,
  fields,
  sections,
  issues,
  index,
  totalRules,
  defaultExpanded = false,
  isSelected = false,
  onToggleSelect,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
}: RuleCardProps) {
  const rule = migrateRule(rawRule);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const firstAction = rule.actions[0];
  const firstActionMeta = firstAction ? LOGIC_ACTION_META.find((m) => m.action === firstAction.action) : undefined;
  const FirstActionIcon = firstAction ? ACTION_ICONS[firstAction.action] : undefined;
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  const updateAction = (actionId: string, patch: Partial<LogicRuleAction>) => {
    const nextActions = rule.actions.map((a) =>
      a.id === actionId ? { ...a, ...patch } : a
    );
    onChange({ actions: nextActions });
  };

  const handleActionTypeChange = (actionId: string, next: LogicAction) => {
    const patch: Partial<LogicRuleAction> = { action: next };
    if (!actionNeedsTargets(next)) patch.targetFieldIds = [];
    if (next !== "skip_to_page") patch.targetPageIndex = undefined;
    if (next !== "skip_to_section") patch.targetSectionId = undefined;
    if (next !== "jump_to_field") patch.targetFieldId = undefined;
    if (next !== "set_value") patch.valueSource = undefined;
    if (next !== "redirect_to_url") patch.targetUrl = undefined;
    if (next === "set_value") {
      const existing = rule.actions.find((a) => a.id === actionId);
      if (!existing?.valueSource) patch.valueSource = { mode: "static", staticValue: "" };
    }
    updateAction(actionId, patch);
  };

  const addAction = () => {
    onChange({ actions: [...rule.actions, createEmptyRuleAction()] });
  };

  const removeAction = (actionId: string) => {
    onChange({ actions: rule.actions.filter((a) => a.id !== actionId) });
  };

  return (
    <Card
      className={cn(
        "transition-colors py-0 gap-0",
        !rule.enabled && "opacity-60",
        errorCount > 0 && "border-destructive/50",
        errorCount === 0 && warnCount > 0 && "border-amber-500/50"
      )}
    >
      <CardHeader className="flex flex-row items-center gap-2 p-3 [.border-b]:pb-3 border-b border-border">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="p-1 -m-1 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded-md shrink-0",
            firstAction ? ACTION_COLORS[firstAction.action] : "bg-muted text-muted-foreground"
          )}
        >
          {FirstActionIcon && <FirstActionIcon className="h-3.5 w-3.5" />}
        </div>

        <Input
          value={rule.name ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Rule name"
          className="h-8 text-sm flex-1 bg-transparent border-transparent hover:border-border focus-visible:border-ring"
        />

        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
          #{index + 1}
        </Badge>

        {errorCount > 0 && (
          <Badge variant="destructive" className="text-[10px] gap-1 shrink-0">
            <AlertTriangle className="h-3 w-3" />
            {errorCount}
          </Badge>
        )}
        {errorCount === 0 && warnCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] gap-1 shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
          >
            <AlertTriangle className="h-3 w-3" />
            {warnCount}
          </Badge>
        )}

        <Switch
          checked={rule.enabled}
          onCheckedChange={(v) => onChange({ enabled: v })}
        />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={onDuplicate}
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete rule?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the rule
                &quot;{rule.name || "Untitled"}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} variant="destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <CardContent className="p-4 space-y-4">
              {/* Issues banner */}
              {issues.length > 0 && (
                <div className="space-y-1">
                  {issues.map((issue, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 text-xs px-2.5 py-1.5 rounded-md border",
                        issue.severity === "error"
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                      )}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* IF (conditions) */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono font-semibold uppercase tracking-wider bg-muted/60"
                  >
                    IF
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Evaluate these conditions against the respondent&apos;s answers
                  </span>
                </div>
                <ConditionBuilder
                  group={rule.conditions}
                  fields={fields.filter((f) => !["page_break", "section", "paragraph", "divider", "video"].includes(f.type))}
                  sections={sections}
                  onChange={(next) => onChange({ conditions: next })}
                />
              </div>

              <Separator />

              {/* DO (actions) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono font-semibold uppercase tracking-wider bg-muted/60"
                  >
                    DO
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Actions to perform when conditions are met
                  </span>
                </div>

                {rule.actions.map((ruleAction, actionIdx) => {
                  const meta = LOGIC_ACTION_META.find((m) => m.action === ruleAction.action);
                  const Icon = ACTION_ICONS[ruleAction.action];
                  return (
                    <div
                      key={ruleAction.id}
                      className={cn(
                        "rounded-lg border border-border bg-muted/20 p-3 space-y-2",
                        rule.actions.length > 1 && "relative"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-md shrink-0",
                            ACTION_COLORS[ruleAction.action]
                          )}
                        >
                          {Icon && <Icon className="h-3 w-3" />}
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Action {rule.actions.length > 1 ? `#${actionIdx + 1}` : ""}
                        </span>
                        {meta && (
                          <span className="text-[10px] text-muted-foreground/60 ml-auto mr-1">
                            {meta.description}
                          </span>
                        )}
                        {rule.actions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => removeAction(ruleAction.id)}
                            title="Remove action"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 items-start">
                        <Select value={ruleAction.action} onValueChange={(v) => handleActionTypeChange(ruleAction.id, v as LogicAction)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["visibility", "state", "value", "navigation"] as const).map((cat) => {
                              const options = LOGIC_ACTION_META.filter((m) => m.category === cat);
                              if (options.length === 0) return null;
                              return (
                                <SelectGroup key={cat}>
                                  <SelectLabel className="capitalize">{cat}</SelectLabel>
                                  {options.map((m) => (
                                    <SelectItem key={m.action} value={m.action}>
                                      {m.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        <ActionTargetEditor
                          ruleAction={ruleAction}
                          fields={fields}
                          sections={sections}
                          onChange={(patch) => updateAction(ruleAction.id, patch)}
                        />
                      </div>

                      {ruleAction.action === "set_value" && (
                        <ActionSetValueEditor
                          ruleAction={ruleAction}
                          fields={fields}
                          sections={sections}
                          onChange={(patch) => updateAction(ruleAction.id, patch)}
                        />
                      )}
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addAction}
                >
                  <Plus className="h-3 w-3" />
                  Add action
                </Button>
              </div>

              {/* Footer: order controls inside expanded content */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {onToggleSelect && (
                    <button
                      type="button"
                      className={cn(
                        "h-4 w-4 rounded border transition-all shrink-0 flex items-center justify-center",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 hover:border-muted-foreground/60 bg-transparent"
                      )}
                      onClick={onToggleSelect}
                      title="Select rule"
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="text-[11px] text-muted-foreground">
                    Rules run top-to-bottom. Later rules override earlier ones for the same field.
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onMove("up")}
                    disabled={index === 0}
                  >
                    Move up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onMove("down")}
                    disabled={index === totalRules - 1}
                  >
                    Move down
                  </Button>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-t border-border"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
              <div className="flex items-center gap-2">
                {onToggleSelect && (
                  <button
                    type="button"
                    className={cn(
                      "h-4 w-4 rounded border transition-all shrink-0 flex items-center justify-center",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 hover:border-muted-foreground/60 bg-transparent"
                    )}
                    onClick={onToggleSelect}
                    title="Select rule"
                  >
                    {isSelected && (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )}
                <div className="text-[11px] text-muted-foreground">
                  Rules run top-to-bottom. Later rules override earlier ones for the same field.
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onMove("up")}
                  disabled={index === 0}
                >
                  Move up
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onMove("down")}
                  disabled={index === totalRules - 1}
                >
                  Move down
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Target editor ───────────────────────────────────────────────────────────

function ActionTargetEditor({
  ruleAction,
  fields,
  sections,
  onChange,
}: {
  ruleAction: LogicRuleAction;
  fields: BuilderField[];
  sections: BuilderSection[];
  onChange: (patch: Partial<LogicRuleAction>) => void;
}) {
  const realFields = fields.filter((f) => !["page_break", "section"].includes(f.type));
  // Paragraph/divider only support show/hide — exclude from other field-targeting actions
  const visualOnlyActions: string[] = ["show_field", "hide_field"];
  const targetFields = visualOnlyActions.includes(ruleAction.action)
    ? realFields
    : realFields.filter((f) => !["paragraph", "divider", "video"].includes(f.type));

  if (actionNeedsTargets(ruleAction.action)) {
    return (
      <FieldMultiPicker
        fields={targetFields}
        sections={sections}
        selected={ruleAction.targetFieldIds ?? []}
        onChange={(vals) => onChange({ targetFieldIds: vals })}
        placeholder="Select target field(s)"
      />
    );
  }

  if (ruleAction.action === "skip_to_section") {
    return (
      <Select
        value={ruleAction.targetSectionId ?? ""}
        onValueChange={(v) => onChange({ targetSectionId: v })}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select section" />
        </SelectTrigger>
        <SelectContent>
          {sections.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {stripHtml(s.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (ruleAction.action === "skip_to_page") {
    const sorted = [...sections]
      .filter((s) => s.type !== "success")
      .sort((a, b) => a.orderIndex - b.orderIndex);
    return (
      <Select
        value={ruleAction.targetPageIndex != null ? String(ruleAction.targetPageIndex) : ""}
        onValueChange={(v) => onChange({ targetPageIndex: Number(v) })}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select page" />
        </SelectTrigger>
        <SelectContent>
          {sorted.map((s, i) => (
            <SelectItem key={s.id} value={String(i)}>
              {stripHtml(s.name) || `Page ${i + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (ruleAction.action === "jump_to_field") {
    return (
      <FieldPicker
        fields={realFields}
        sections={sections}
        value={ruleAction.targetFieldId ?? ""}
        onChange={(v) => onChange({ targetFieldId: v })}
        placeholder="Select field"
      />
    );
  }

  if (ruleAction.action === "redirect_to_url") {
    return (
      <Input
        value={ruleAction.targetUrl ?? ""}
        onChange={(e) => onChange({ targetUrl: e.target.value })}
        placeholder="https://example.com"
        className="h-9 text-sm"
      />
    );
  }

  return null;
}

// ─── set_value editor ────────────────────────────────────────────────────────

function ActionSetValueEditor({
  ruleAction,
  fields,
  sections,
  onChange,
}: {
  ruleAction: LogicRuleAction;
  fields: BuilderField[];
  sections: BuilderSection[];
  onChange: (patch: Partial<LogicRuleAction>) => void;
}) {
  const source = ruleAction.valueSource ?? { mode: "static", staticValue: "" };
  const primaryTarget = fields.find((f) => f.id === (ruleAction.targetFieldIds ?? [])[0]);

  const setMode = (mode: LogicValueSource["mode"]) => {
    if (mode === "static") onChange({ valueSource: { mode, staticValue: "" } });
    if (mode === "copy_field") onChange({ valueSource: { mode, sourceFieldId: "" } });
    if (mode === "formula") onChange({ valueSource: { mode, formula: "" } });
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="text-[10px] font-mono font-semibold uppercase tracking-wider bg-background"
        >
          Value source
        </Badge>
        <Select value={source.mode} onValueChange={(v) => setMode(v as LogicValueSource["mode"])}>
          <SelectTrigger className="h-7 text-xs w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="static">
              <span className="flex items-center gap-2"><Hash className="h-3 w-3" /> Static value</span>
            </SelectItem>
            <SelectItem value="copy_field">
              <span className="flex items-center gap-2"><Link2 className="h-3 w-3" /> Copy from field</span>
            </SelectItem>
            <SelectItem value="formula">
              <span className="flex items-center gap-2"><Calculator className="h-3 w-3" /> Formula</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {source.mode === "static" && (
        <ValueInput
          field={primaryTarget}
          operator="equal"
          value={source.staticValue}
          onChange={(v: FormAnswer) => onChange({ valueSource: { mode: "static", staticValue: v } })}
          placeholder="Value to set"
        />
      )}

      {source.mode === "copy_field" && (
        <FieldPicker
          fields={fields.filter((f) => !["page_break", "section", "paragraph", "divider", "video"].includes(f.type))}
          sections={sections}
          value={source.sourceFieldId ?? ""}
          onChange={(v) => onChange({ valueSource: { mode: "copy_field", sourceFieldId: v } })}
          placeholder="Select source field"
        />
      )}

      {source.mode === "formula" && (
        <div className="space-y-1">
          <Input
            value={source.formula ?? ""}
            onChange={(e) => onChange({ valueSource: { mode: "formula", formula: e.target.value } })}
            placeholder="e.g. {fieldA} + {fieldB} * 2"
            className="h-8 text-sm font-mono"
          />
          <p className="text-[10px] text-muted-foreground leading-tight">
            Use <code className="bg-muted px-1 rounded">{"{fieldId}"}</code> to reference a field. Supports <code className="bg-muted px-1 rounded">+ - * / ( )</code> only.
          </p>
        </div>
      )}
    </div>
  );
}
