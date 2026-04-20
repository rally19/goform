"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import type { BuilderField, BuilderSection } from "@/lib/form-types";
import { Check, ChevronsUpDown, ChevronRight, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/sanitize";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface SectionGroup {
  section: BuilderSection | null;
  fields: BuilderField[];
}

function groupFieldsBySections(
  fields: BuilderField[],
  sections: BuilderSection[]
): SectionGroup[] {
  const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const grouped: SectionGroup[] = [];

  const unsectioned = fields
    .filter((f) => !f.sectionId && f.type !== "page_break" && f.type !== "section")
    .sort((a, b) => a.orderIndex - b.orderIndex);
  if (unsectioned.length > 0) {
    grouped.push({ section: null, fields: unsectioned });
  }

  for (const sec of sorted) {
    const sectionFields = fields
      .filter((f) => f.sectionId === sec.id && f.type !== "page_break" && f.type !== "section")
      .sort((a, b) => a.orderIndex - b.orderIndex);
    if (sectionFields.length > 0) {
      grouped.push({ section: sec, fields: sectionFields });
    }
  }

  return grouped;
}

function filterGroups(groups: SectionGroup[], query: string): SectionGroup[] {
  if (!query.trim()) return groups;
  const q = query.toLowerCase();
  return groups
    .map((g) => ({
      ...g,
      fields: g.fields.filter(
        (f) =>
          (f.label || "").toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q)
      ),
    }))
    .filter(
      (g) =>
        g.fields.length > 0 ||
        (g.section?.name || "").toLowerCase().includes(q)
    );
}

// ─── Single select ────────────────────────────────────────────────────────────

interface FieldPickerProps {
  fields: BuilderField[];
  sections: BuilderSection[];
  value: string;
  onChange: (fieldId: string) => void;
  placeholder?: string;
  className?: string;
  showDeleted?: boolean;
  deletedFieldId?: string;
}

export function FieldPicker({
  fields,
  sections,
  value,
  onChange,
  placeholder = "Select field",
  className,
  showDeleted,
  deletedFieldId,
}: FieldPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupFieldsBySections(fields, sections), [fields, sections]);
  const filtered = useMemo(() => filterGroups(groups, search), [groups, search]);

  const selectedField = fields.find((f) => f.id === value);
  const label = selectedField ? (stripHtml(selectedField.label) || "(untitled)") : null;

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-8 justify-between text-sm bg-background hover:bg-background/80",
            !label && "text-muted-foreground",
            showDeleted && deletedFieldId && "border-destructive/50 text-destructive",
            className
          )}
        >
          <span className="truncate">
            {showDeleted && deletedFieldId && !selectedField
              ? "Deleted field"
              : label ?? placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fields..."
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No fields found.
              </div>
            )}
            {filtered.map((group) => {
              const sectionId = group.section?.id ?? "__unsectioned__";
              const isCollapsed = collapsed[sectionId] ?? false;

              return (
                <div key={sectionId}>
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionId)}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">
                      {group.section ? stripHtml(group.section.name) : "Unsectioned"}
                    </span>
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground/60">
                      {group.fields.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="ml-3 border-l border-border/60 pl-1">
                      {group.fields.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            onChange(f.id);
                            setOpen(false);
                            setSearch("");
                          }}
                          className={cn(
                            "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                            f.id === value
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-muted/50"
                          )}
                        >
                          {f.id === value && (
                            <Check className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{stripHtml(f.label) || "(untitled)"}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">
                            {f.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {showDeleted && deletedFieldId && !selectedField && (
              <div className="px-2 py-1.5 text-xs text-destructive">
                Deleted field
              </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Multi select ─────────────────────────────────────────────────────────────

interface FieldMultiPickerProps {
  fields: BuilderField[];
  sections: BuilderSection[];
  selected: string[];
  onChange: (fieldIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function FieldMultiPicker({
  fields,
  sections,
  selected,
  onChange,
  placeholder = "Select target field(s)",
  className,
}: FieldMultiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupFieldsBySections(fields, sections), [fields, sections]);
  const filtered = useMemo(() => filterGroups(groups, search), [groups, search]);

  const toggleField = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const removeField = (id: string) => {
    onChange(selected.filter((s) => s !== id));
  };

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-auto min-h-9 justify-between text-sm bg-background hover:bg-background/80",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center py-0.5">
            {selected.length > 0 ? (
              selected.map((id) => {
                const f = fields.find((fl) => fl.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1 bg-muted/60 hover:bg-muted text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(id);
                    }}
                  >
                    {stripHtml(f?.label) || "(untitled)"}
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </Badge>
                );
              })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fields..."
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No fields found.
              </div>
            )}
            {filtered.map((group) => {
              const sectionId = group.section?.id ?? "__unsectioned__";
              const isCollapsed = collapsed[sectionId] ?? false;
              const selectedInGroup = group.fields.filter((f) =>
                selected.includes(f.id)
              ).length;

              return (
                <div key={sectionId}>
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionId)}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">
                      {group.section ? stripHtml(group.section.name) : "Unsectioned"}
                    </span>
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground/60">
                      {selectedInGroup > 0
                        ? `${selectedInGroup}/${group.fields.length}`
                        : group.fields.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="ml-3 border-l border-border/60 pl-1">
                      {group.fields.map((f) => {
                        const isSelected = selected.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleField(f.id)}
                            className={cn(
                              "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground hover:bg-muted/50"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-sm border border-primary shrink-0 transition-all",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible"
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </div>
                            <span className="truncate">{stripHtml(f.label) || "(untitled)"}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">
                              {f.type}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
