import type {
  FormAnswer,
  LogicCondition,
  LogicConditionGroup,
  LogicOperator,
  LogicRule,
  LogicAction,
  BuilderField,
} from "./form-types";
import { LOGIC_ACTION_META, LOGIC_OPERATOR_META } from "./form-types";

// ─── Runtime evaluation ──────────────────────────────────────────────────────

/**
 * The dynamic state of every field, as computed by the logic engine.
 * Starts from the field's declared defaults and is mutated by matching rules.
 */
export interface FieldDynamicState {
  visible: boolean;
  enabled: boolean;
  required: boolean;
  masked: boolean;
  /** If a rule with `set_value` matched, this is the value to show. */
  overriddenValue?: FormAnswer;
}

export interface NavigationOverride {
  kind: "page" | "section" | "field";
  targetPageIndex?: number;
  targetSectionId?: string;
  targetFieldId?: string;
}

export interface EngineResult {
  states: Record<string, FieldDynamicState>;
  /** The last matching navigation action (if any). Used when the user clicks Next. */
  navigation?: NavigationOverride;
  /** Errors encountered while evaluating (missing field references, etc.) */
  warnings: string[];
}

function baselineState(field: BuilderField): FieldDynamicState {
  return {
    visible: !field.properties?.defaultHidden,
    enabled: !field.properties?.defaultDisabled,
    required: field.required,
    masked: !!field.properties?.defaultMasked,
  };
}

function normalize(v: FormAnswer): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v;
  if (Array.isArray(v)) return v.join(","); // flatten for equality/contains
  return String(v);
}

function asArray(v: FormAnswer): (string | number)[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v as (string | number)[];
  return [v as string | number];
}

function parseList(v: FormAnswer): (string | number)[] {
  // accepts either array or comma-separated string list
  if (Array.isArray(v)) return v as (string | number)[];
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  if (typeof v === "number") return [v];
  return [];
}

export function isAnswerEmpty(v: FormAnswer): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "number") return Number.isNaN(v);
  return false;
}

function compareNumeric(a: FormAnswer, b: FormAnswer): number | null {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) {
    // fall back to date strings
    const da = Date.parse(String(a));
    const db = Date.parse(String(b));
    if (Number.isNaN(da) || Number.isNaN(db)) return null;
    return da - db;
  }
  return na - nb;
}

export function evaluateCondition(
  condition: LogicCondition,
  answers: Record<string, FormAnswer>
): boolean {
  const actual = answers[condition.fieldId];
  const { operator, value, value2 } = condition;

  switch (operator) {
    case "empty":
      return isAnswerEmpty(actual);
    case "filled":
      return !isAnswerEmpty(actual);

    case "equal":
      return normalize(actual) === normalize(value ?? null);
    case "not_equal":
      return normalize(actual) !== normalize(value ?? null);

    case "contains": {
      const needle = String(value ?? "").toLowerCase();
      if (Array.isArray(actual)) {
        return actual.some((item) => String(item).toLowerCase().includes(needle));
      }
      return String(actual ?? "").toLowerCase().includes(needle);
    }
    case "not_contains": {
      const needle = String(value ?? "").toLowerCase();
      if (Array.isArray(actual)) {
        return !actual.some((item) => String(item).toLowerCase().includes(needle));
      }
      return !String(actual ?? "").toLowerCase().includes(needle);
    }

    case "starts_with":
      return String(actual ?? "").toLowerCase().startsWith(String(value ?? "").toLowerCase());
    case "ends_with":
      return String(actual ?? "").toLowerCase().endsWith(String(value ?? "").toLowerCase());

    case "greater_than": {
      const cmp = compareNumeric(actual, value ?? null);
      return cmp !== null && cmp > 0;
    }
    case "less_than": {
      const cmp = compareNumeric(actual, value ?? null);
      return cmp !== null && cmp < 0;
    }
    case "greater_than_or_equal": {
      const cmp = compareNumeric(actual, value ?? null);
      return cmp !== null && cmp >= 0;
    }
    case "less_than_or_equal": {
      const cmp = compareNumeric(actual, value ?? null);
      return cmp !== null && cmp <= 0;
    }
    case "between": {
      const low = compareNumeric(actual, value ?? null);
      const high = compareNumeric(actual, value2 ?? null);
      return low !== null && high !== null && low >= 0 && high <= 0;
    }

    case "is_one_of": {
      const set = parseList(value ?? null).map((s) => String(s).toLowerCase());
      const actualItems = asArray(actual).map((s) => String(s).toLowerCase());
      return actualItems.some((item) => set.includes(item));
    }
    case "is_none_of": {
      const set = parseList(value ?? null).map((s) => String(s).toLowerCase());
      const actualItems = asArray(actual).map((s) => String(s).toLowerCase());
      return !actualItems.some((item) => set.includes(item));
    }

    default:
      return false;
  }
}

export function evaluateConditionGroup(
  group: LogicConditionGroup,
  answers: Record<string, FormAnswer>
): boolean {
  const combinator = group.combinator ?? "and";
  const results: boolean[] = [];

  for (const cond of group.conditions ?? []) {
    results.push(evaluateCondition(cond, answers));
  }

  for (const sub of group.groups ?? []) {
    results.push(evaluateConditionGroup(sub, answers));
  }

  if (results.length === 0) return true; // vacuously true — "always match"
  return combinator === "and" ? results.every(Boolean) : results.some(Boolean);
}

function resolveValue(
  rule: LogicRule,
  answers: Record<string, FormAnswer>
): FormAnswer | undefined {
  const src = rule.valueSource;
  if (!src) return undefined;

  if (src.mode === "static") return src.staticValue;
  if (src.mode === "copy_field") return answers[src.sourceFieldId ?? ""] ?? null;

  if (src.mode === "formula") {
    // Very small, safe formula interpreter: replaces {fieldId} tokens with numeric answers
    // and supports basic arithmetic. Rejects anything else.
    const expr = (src.formula ?? "").replace(/\{([a-z0-9_-]+)\}/gi, (_, id) => {
      const v = answers[id];
      const n = Number(v);
      return Number.isFinite(n) ? String(n) : "0";
    });
    if (!/^[-+*/().\d\s]+$/.test(expr)) return null;
    try {
      const result = Function(`"use strict"; return (${expr});`)();
      return typeof result === "number" && Number.isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }
  return undefined;
}

/**
 * Runs all enabled rules in order. Later rules override earlier ones for the
 * same field/property. Returns the resulting dynamic state plus any matched
 * navigation action.
 */
export function evaluateLogic(
  fields: BuilderField[],
  rules: LogicRule[],
  answers: Record<string, FormAnswer>
): EngineResult {
  const states: Record<string, FieldDynamicState> = {};
  for (const f of fields) states[f.id] = baselineState(f);

  const warnings: string[] = [];
  let navigation: NavigationOverride | undefined;

  const sorted = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  for (const rule of sorted) {
    let matched = true;
    try {
      matched = evaluateConditionGroup(rule.conditions, answers);
    } catch (err) {
      warnings.push(`Rule "${rule.name ?? rule.id}" failed: ${(err as Error).message}`);
      matched = false;
    }
    if (!matched) continue;

    const targets = rule.targetFieldIds ?? [];
    switch (rule.action) {
      case "show_field":
        for (const t of targets) if (states[t]) states[t].visible = true;
        break;
      case "hide_field":
        for (const t of targets) if (states[t]) states[t].visible = false;
        break;
      case "enable_field":
        for (const t of targets) if (states[t]) states[t].enabled = true;
        break;
      case "disable_field":
        for (const t of targets) if (states[t]) states[t].enabled = false;
        break;
      case "require_field":
        for (const t of targets) if (states[t]) states[t].required = true;
        break;
      case "unrequire_field":
        for (const t of targets) if (states[t]) states[t].required = false;
        break;
      case "mask_field":
        for (const t of targets) if (states[t]) states[t].masked = true;
        break;
      case "unmask_field":
        for (const t of targets) if (states[t]) states[t].masked = false;
        break;
      case "set_value": {
        const v = resolveValue(rule, answers);
        for (const t of targets) if (states[t]) states[t].overriddenValue = v;
        break;
      }
      case "skip_to_page":
        if (typeof rule.targetPageIndex === "number") {
          navigation = { kind: "page", targetPageIndex: rule.targetPageIndex };
        }
        break;
      case "skip_to_section":
        if (rule.targetSectionId) {
          navigation = { kind: "section", targetSectionId: rule.targetSectionId };
        }
        break;
      case "jump_to_field":
        if (rule.targetFieldId) {
          navigation = { kind: "field", targetFieldId: rule.targetFieldId };
        }
        break;
    }
  }

  return { states, navigation, warnings };
}

// ─── Conflict / Validation detection ─────────────────────────────────────────

export type LogicIssueSeverity = "error" | "warning";

export interface LogicIssue {
  severity: LogicIssueSeverity;
  ruleId?: string;
  fieldId?: string;
  message: string;
}

function collectConditionFieldIds(group: LogicConditionGroup, acc: Set<string>) {
  for (const c of group.conditions ?? []) acc.add(c.fieldId);
  for (const g of group.groups ?? []) collectConditionFieldIds(g, acc);
}

/**
 * Inspects all rules against the current field set and returns a list of
 * issues: missing field references, conflicting actions, unreachable rules,
 * circular set_value copies, etc.
 */
export function detectLogicIssues(
  fields: BuilderField[],
  rules: LogicRule[]
): LogicIssue[] {
  const issues: LogicIssue[] = [];
  const fieldIds = new Set(fields.map((f) => f.id));
  const fieldById = new Map(fields.map((f) => [f.id, f]));

  // Per-target action tally for conflict detection
  const actionsByTarget = new Map<string, Set<LogicAction>>();

  for (const rule of rules) {
    // Missing condition fields
    const used = new Set<string>();
    collectConditionFieldIds(rule.conditions, used);
    for (const id of used) {
      if (!fieldIds.has(id)) {
        issues.push({
          severity: "error",
          ruleId: rule.id,
          message: `Rule "${rule.name ?? "Untitled"}" references a deleted field in its conditions`,
        });
      }
    }

    // Validate targets
    const needsTargets = [
      "show_field", "hide_field", "enable_field", "disable_field",
      "require_field", "unrequire_field", "mask_field", "unmask_field", "set_value",
    ].includes(rule.action);

    if (needsTargets) {
      const targets = rule.targetFieldIds ?? [];
      if (targets.length === 0) {
        issues.push({
          severity: "error",
          ruleId: rule.id,
          message: `Rule "${rule.name ?? "Untitled"}" has no target field`,
        });
      }
      for (const t of targets) {
        if (!fieldIds.has(t)) {
          issues.push({
            severity: "error",
            ruleId: rule.id,
            fieldId: t,
            message: `Rule "${rule.name ?? "Untitled"}" targets a deleted field`,
          });
        } else {
          if (!actionsByTarget.has(t)) actionsByTarget.set(t, new Set());
          actionsByTarget.get(t)!.add(rule.action);
        }
      }
    }

    // Navigation targets
    if (rule.action === "skip_to_page" && typeof rule.targetPageIndex !== "number") {
      issues.push({ severity: "error", ruleId: rule.id, message: `"Skip to page" has no destination set` });
    }
    if (rule.action === "skip_to_section" && !rule.targetSectionId) {
      issues.push({ severity: "error", ruleId: rule.id, message: `"Skip to section" has no destination set` });
    }
    if (rule.action === "jump_to_field") {
      if (!rule.targetFieldId) {
        issues.push({ severity: "error", ruleId: rule.id, message: `"Scroll to field" has no destination set` });
      } else if (!fieldIds.has(rule.targetFieldId)) {
        issues.push({ severity: "error", ruleId: rule.id, message: `"Scroll to field" references a deleted field` });
      }
    }

    // set_value — reject circular copy (field copying itself)
    if (rule.action === "set_value" && rule.valueSource?.mode === "copy_field") {
      const src = rule.valueSource.sourceFieldId;
      if (src && (rule.targetFieldIds ?? []).includes(src)) {
        issues.push({
          severity: "error",
          ruleId: rule.id,
          message: `Rule "${rule.name ?? "Untitled"}" copies a field into itself`,
        });
      }
      if (src && !fieldIds.has(src)) {
        issues.push({
          severity: "error",
          ruleId: rule.id,
          message: `Rule "${rule.name ?? "Untitled"}" copies from a deleted field`,
        });
      }
    }

    // Empty condition group (always matches — warning)
    if ((rule.conditions.conditions?.length ?? 0) === 0 && (rule.conditions.groups?.length ?? 0) === 0) {
      issues.push({
        severity: "warning",
        ruleId: rule.id,
        message: `Rule "${rule.name ?? "Untitled"}" has no conditions and will always run`,
      });
    }
  }

  // Conflicting actions on the same target
  for (const [targetId, actions] of actionsByTarget.entries()) {
    for (const action of actions) {
      const meta = LOGIC_ACTION_META.find((m) => m.action === action);
      if (!meta) continue;
      for (const conflict of meta.conflictsWith) {
        if (actions.has(conflict)) {
          const field = fieldById.get(targetId);
          issues.push({
            severity: "warning",
            fieldId: targetId,
            message: `Field "${field?.label ?? targetId.slice(0, 6)}" is targeted by conflicting rules (${meta.label} vs ${
              LOGIC_ACTION_META.find((m) => m.action === conflict)?.label ?? conflict
            }). Later-defined rule wins.`,
          });
          break;
        }
      }
    }
  }

  return issues;
}

// ─── Helpers to build new rules ──────────────────────────────────────────────

export function createEmptyRule(orderIndex: number): LogicRule {
  return {
    id: crypto.randomUUID(),
    name: "New rule",
    enabled: true,
    action: "hide_field",
    orderIndex,
    targetFieldIds: [],
    conditions: {
      id: crypto.randomUUID(),
      combinator: "and",
      conditions: [],
      groups: [],
    },
  };
}

export function createEmptyCondition(fieldId = ""): LogicCondition {
  return {
    id: crypto.randomUUID(),
    fieldId,
    operator: "equal",
    value: "",
  };
}

export function createEmptyGroup(): LogicConditionGroup {
  return {
    id: crypto.randomUUID(),
    combinator: "and",
    conditions: [],
    groups: [],
  };
}

export function operatorLabel(op: LogicOperator): string {
  return LOGIC_OPERATOR_META.find((m) => m.operator === op)?.label ?? op;
}

export function actionLabel(a: LogicAction): string {
  return LOGIC_ACTION_META.find((m) => m.action === a)?.label ?? a;
}

export function actionNeedsTargets(a: LogicAction): boolean {
  return [
    "show_field", "hide_field", "enable_field", "disable_field",
    "require_field", "unrequire_field", "mask_field", "unmask_field", "set_value",
  ].includes(a);
}

export function actionIsNavigation(a: LogicAction): boolean {
  return ["skip_to_page", "skip_to_section", "jump_to_field"].includes(a);
}
