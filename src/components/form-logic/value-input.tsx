"use client";

import type { BuilderField, FormAnswer, LogicOperator } from "@/lib/form-types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";

import { sanitize } from "@/lib/sanitize";

interface ValueInputProps {
  field?: BuilderField;
  operator: LogicOperator;
  value: FormAnswer | undefined;
  onChange: (v: FormAnswer) => void;
  placeholder?: string;
}

/**
 * Renders an input sized to the referenced field's type.
 * Falls back to a plain text input when the field is unknown.
 */
export function ValueInput({ field, operator, value, onChange, placeholder }: ValueInputProps) {
  const isListOperator = operator === "is_one_of" || operator === "is_none_of";

  // Grid fields — show column picker
  if (field && ["radio_grid", "checkbox_grid"].includes(field.type)) {
    const columns = (field.properties?.columns ?? []) as { label: string; value: string }[];
    return (
      <Select
        value={value != null ? String(value) : ""}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((col) => (
            <SelectItem key={col.value} value={col.value}>
              <div 
                className="prose-sm max-w-full [&_img]:hidden truncate"
                dangerouslySetInnerHTML={{ __html: sanitize(col.label) }}
              />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Choice-style fields with a known option set
  if (field && ["radio", "select"].includes(field.type) && !isListOperator) {
    return (
      <Select
        value={value != null ? String(value) : ""}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div 
                className="prose-sm max-w-full [&_img]:hidden truncate"
                dangerouslySetInnerHTML={{ __html: sanitize(opt.label) }}
              />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field && ["checkbox", "multi_select"].includes(field.type) && !isListOperator) {
    const current = Array.isArray(value) ? (value as string[]) : [];
    return (
      <MultiSelect
        options={(field.options ?? []).map((o) => ({ label: o.label, value: o.value }))}
        selected={current}
        onChange={(vals: string[]) => onChange(vals)}
        placeholder="Select options"
      />
    );
  }

  // List operators — free-text, comma separated
  if (isListOperator) {
    const str = Array.isArray(value) ? (value as string[]).join(", ") : String(value ?? "");
    return (
      <Input
        className="h-8 text-sm"
        value={str}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="value1, value2, value3"
      />
    );
  }

  // Number/rating/scale → number input
  if (field && ["number", "rating", "scale"].includes(field.type)) {
    return (
      <Input
        className="h-8 text-sm"
        type="number"
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder={placeholder ?? "0"}
      />
    );
  }

  if (field && field.type === "date") {
    return (
      <Input
        className="h-8 text-sm"
        type="date"
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field && field.type === "time") {
    return (
      <Input
        className="h-8 text-sm"
        type="time"
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field && field.type === "datetime") {
    return (
      <Input
        className="h-8 text-sm"
        type="datetime-local"
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // Default: text
  return (
    <Input
      className="h-8 text-sm"
      value={value != null ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Value"}
    />
  );
}
