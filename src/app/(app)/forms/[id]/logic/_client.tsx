"use client";

import { useCallback, useMemo, useState } from "react";
import type { BuilderField, BuilderSection, LogicRule } from "@/lib/form-types";
import { saveFormLogic } from "@/lib/actions/forms";
import {
  createEmptyRule,
  detectLogicIssues,
  type LogicIssue,
} from "@/lib/form-logic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleCard } from "@/components/form-logic/rule-card";
import {
  GitBranch, Plus, Loader2, AlertTriangle, Info,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LogicClientProps {
  formId: string;
  formTitle: string;
  fields: BuilderField[];
  sections: BuilderSection[];
  initialLogic: LogicRule[];
}

export function LogicClient({
  formId,
  fields,
  sections,
  initialLogic,
}: LogicClientProps) {
  const [rules, setRules] = useState<LogicRule[]>(initialLogic);
  const [savedRules, setSavedRules] = useState<LogicRule[]>(initialLogic);
  const [saving, setSaving] = useState(false);
  const [lastAddedRuleId, setLastAddedRuleId] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(rules) !== JSON.stringify(savedRules),
    [rules, savedRules]
  );

  const issues = useMemo(() => detectLogicIssues(fields, rules), [fields, rules]);
  const issuesByRule = useMemo(() => {
    const map = new Map<string, LogicIssue[]>();
    for (const issue of issues) {
      if (!issue.ruleId) continue;
      if (!map.has(issue.ruleId)) map.set(issue.ruleId, []);
      map.get(issue.ruleId)!.push(issue);
    }
    return map;
  }, [issues]);
  const globalIssues = useMemo(
    () => issues.filter((i) => !i.ruleId),
    [issues]
  );

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  const addRule = () => {
    const newRule = createEmptyRule(rules.length);
    setLastAddedRuleId(newRule.id);
    setRules((prev) => [...prev, newRule]);
  };

  const updateRule = useCallback((id: string, patch: Partial<LogicRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules((prev) =>
      prev
        .filter((r) => r.id !== id)
        .map((r, i) => ({ ...r, orderIndex: i }))
    );
  }, []);

  const duplicateRule = useCallback((id: string) => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const source = prev[idx];
      const copy: LogicRule = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name ?? "Untitled"} (copy)`,
        orderIndex: idx + 1,
        actions: (source.actions ?? []).map((a) => ({ ...a, id: crypto.randomUUID() })),
        conditions: {
          ...source.conditions,
          id: crypto.randomUUID(),
          conditions: source.conditions.conditions.map((c) => ({
            ...c,
            id: crypto.randomUUID(),
          })),
          groups: (source.conditions.groups ?? []).map((g) => ({
            ...g,
            id: crypto.randomUUID(),
          })),
        },
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next.map((r, i) => ({ ...r, orderIndex: i }));
    });
  }, []);

  const moveRule = useCallback((id: string, direction: "up" | "down") => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((r, i) => ({ ...r, orderIndex: i }));
    });
  }, []);

  const handleSave = async () => {
    if (errorCount > 0) {
      toast.error("Please fix errors before saving");
      return;
    }
    setSaving(true);
    const result = await saveFormLogic(formId, rules);
    setSaving(false);
    if (result.success) {
      setSavedRules(rules);
      toast.success("Logic saved");
    } else {
      toast.error(result.error ?? "Failed to save");
    }
  };

  const handleDiscard = () => {
    setRules(savedRules);
    toast.info("Changes discarded");
  };

  const hasFields = fields.filter((f) => !["page_break", "section", "paragraph", "divider"].includes(f.type)).length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pt-6 md:p-8 max-w-4xl mx-auto space-y-5 pb-16">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Logic
            </h2>
            <p className="text-muted-foreground text-sm">
              Show, hide, disable, require, mask, copy, calculate, or branch fields based on respondent answers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="outline" size="sm" onClick={handleDiscard} disabled={saving}>
                Discard
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryCard
            icon={GitBranch}
            label="Rules"
            value={rules.length}
            tone="default"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Errors"
            value={errorCount}
            tone={errorCount > 0 ? "error" : "default"}
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Warnings"
            value={warnCount}
            tone={warnCount > 0 ? "warning" : "default"}
          />
        </div>

        {/* Global issues */}
        {globalIssues.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Conflicts &amp; warnings
              </CardTitle>
              <CardDescription className="text-xs">
                Some rules may override each other. Later-defined rules win for the same property.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {globalIssues.map((issue, i) => (
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
            </CardContent>
          </Card>
        )}

        {/* Empty states */}
        {!hasFields && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Info className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold">No fields yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add some fields in the builder before creating logic rules.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/forms/${formId}/edit`}>Go to builder</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {hasFields && rules.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-semibold">No rules yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Build conditional branches, auto-fill values, require fields based on answers, and more.
                </p>
              </div>
              <Button onClick={addRule} size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create your first rule
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rules list */}
        {rules.length > 0 && (
          <div className="space-y-3">
            {rules
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((rule, index) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  fields={fields}
                  sections={sections}
                  issues={issuesByRule.get(rule.id) ?? []}
                  index={index}
                  totalRules={rules.length}
                  defaultExpanded={rule.id === lastAddedRuleId}
                  onChange={(patch) => updateRule(rule.id, patch)}
                  onDelete={() => deleteRule(rule.id)}
                  onDuplicate={() => duplicateRule(rule.id)}
                  onMove={(dir) => moveRule(rule.id, dir)}
                />
              ))}

            <div className="flex items-center justify-center pt-2">
              <Button variant="outline" onClick={addRule} className="gap-2" disabled={!hasFields}>
                <Plus className="h-3.5 w-3.5" />
                Add another rule
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "default" | "error" | "warning";
}) {
  return (
    <Card
      className={cn(
        tone === "error" && "border-destructive/40 bg-destructive/5",
        tone === "warning" && "border-amber-500/40 bg-amber-500/5"
      )}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "h-9 w-9 rounded-md flex items-center justify-center",
            tone === "default" && "bg-primary/10 text-primary",
            tone === "error" && "bg-destructive/15 text-destructive",
            tone === "warning" && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
