"use client";

import type {
  BuilderField,
  BuilderSection,
  LogicCondition,
  LogicConditionGroup,
  LogicOperator,
  FormAnswer,
} from "@/lib/form-types";
import { LOGIC_OPERATOR_META } from "@/lib/form-types";
import {
  createEmptyCondition,
  createEmptyGroup,
} from "@/lib/form-logic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldPicker } from "./field-picker";
import { ValueInput } from "./value-input";
import { Plus, Trash2, Folders } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConditionBuilderProps {
  group: LogicConditionGroup;
  fields: BuilderField[];
  sections: BuilderSection[];
  onChange: (group: LogicConditionGroup) => void;
  depth?: number;
}

export function ConditionBuilder({ group, fields, sections, onChange, depth = 0 }: ConditionBuilderProps) {
  const updateCondition = (idx: number, patch: Partial<LogicCondition>) => {
    const next = [...group.conditions];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...group, conditions: next });
  };
  const removeCondition = (idx: number) => {
    const next = group.conditions.filter((_, i) => i !== idx);
    onChange({ ...group, conditions: next });
  };
  const addCondition = () => {
    const defaultFieldId = fields[0]?.id ?? "";
    onChange({
      ...group,
      conditions: [...group.conditions, createEmptyCondition(defaultFieldId)],
    });
  };

  const updateSubGroup = (idx: number, next: LogicConditionGroup) => {
    const groups = [...(group.groups ?? [])];
    groups[idx] = next;
    onChange({ ...group, groups });
  };
  const removeSubGroup = (idx: number) => {
    const groups = (group.groups ?? []).filter((_, i) => i !== idx);
    onChange({ ...group, groups });
  };
  const addSubGroup = () => {
    onChange({
      ...group,
      groups: [...(group.groups ?? []), createEmptyGroup()],
    });
  };

  const toggleCombinator = () => {
    onChange({ ...group, combinator: group.combinator === "and" ? "or" : "and" });
  };

  const isEmpty = group.conditions.length === 0 && (group.groups?.length ?? 0) === 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background/60 p-3 space-y-2",
        depth > 0 && "bg-muted/40"
      )}
    >
      {/* Combinator header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {depth > 0 && <Folders className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isEmpty ? "Always runs" : "Match"}
          </span>
          {!isEmpty && (
            <button
              type="button"
              onClick={toggleCombinator}
              className={cn(
                "inline-flex items-center h-6 px-2 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors",
                group.combinator === "and"
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
              )}
            >
              {group.combinator === "and" ? "All (AND)" : "Any (OR)"}
            </button>
          )}
        </div>
      </div>

      {/* Conditions */}
      {group.conditions.map((cond, idx) => (
        <ConditionRow
          key={cond.id}
          condition={cond}
          fields={fields}
          sections={sections}
          onChange={(patch) => updateCondition(idx, patch)}
          onRemove={() => removeCondition(idx)}
        />
      ))}

      {/* Nested groups */}
      {(group.groups ?? []).map((sub, idx) => (
        <div key={sub.id} className="pl-3 border-l-2 border-border ml-1 relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 absolute -left-3 -top-1 bg-background border border-border rounded-full text-muted-foreground hover:text-destructive"
            onClick={() => removeSubGroup(idx)}
            title="Remove group"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <ConditionBuilder
            group={sub}
            fields={fields}
            sections={sections}
            onChange={(next) => updateSubGroup(idx, next)}
            depth={depth + 1}
          />
        </div>
      ))}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={addCondition}
          disabled={fields.length === 0}
        >
          <Plus className="h-3 w-3" />
          Add condition
        </Button>
        {depth < 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={addSubGroup}
          >
            <Folders className="h-3 w-3" />
            Add group
          </Button>
        )}
      </div>
    </div>
  );
}

function ConditionRow({
  condition,
  fields,
  sections,
  onChange,
  onRemove,
}: {
  condition: LogicCondition;
  fields: BuilderField[];
  sections: BuilderSection[];
  onChange: (patch: Partial<LogicCondition>) => void;
  onRemove: () => void;
}) {
  const selectedField = fields.find((f) => f.id === condition.fieldId);
  const meta = LOGIC_OPERATOR_META.find((m) => m.operator === condition.operator);
  const allowed = LOGIC_OPERATOR_META.filter((m) => {
    if (!selectedField) return true;
    if (!m.appliesTo) return true;
    return m.appliesTo.includes(selectedField.type);
  });
  const needsValue = !!meta?.requiresValue;
  const needsSecondValue = !!meta?.requiresSecondValue;

  const fieldMissing = condition.fieldId && !selectedField;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-1.5 items-center">
      {/* Field picker */}
      <FieldPicker
        fields={fields}
        sections={sections}
        value={condition.fieldId}
        onChange={(v) => onChange({ fieldId: v, value: "", value2: undefined })}
        placeholder="Select field"
        showDeleted={!!fieldMissing}
        deletedFieldId={fieldMissing ? condition.fieldId : undefined}
      />

      {/* Operator */}
      <Select
        value={condition.operator}
        onValueChange={(v) => onChange({ operator: v as LogicOperator })}
      >
        <SelectTrigger className="h-8 text-sm min-w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowed.map((m) => (
            <SelectItem key={m.operator} value={m.operator}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value(s) */}
      <div className="flex gap-1.5 min-w-0">
        {needsValue ? (
          <>
            <div className="flex-1 min-w-0">
              <ValueInput
                field={selectedField}
                operator={condition.operator}
                value={condition.value}
                onChange={(v: FormAnswer) => onChange({ value: v })}
              />
            </div>
            {needsSecondValue && (
              <>
                <span className="text-xs text-muted-foreground self-center">and</span>
                <div className="flex-1 min-w-0">
                  <ValueInput
                    field={selectedField}
                    operator={condition.operator}
                    value={condition.value2}
                    onChange={(v: FormAnswer) => onChange({ value2: v })}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <Badge variant="secondary" className="h-8 px-2 text-xs font-normal">
            no value needed
          </Badge>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onRemove}
        title="Remove condition"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
