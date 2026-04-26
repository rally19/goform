import type {
  FormAnswer,
  LogicCondition,
  LogicConditionGroup,
  LogicOperator,
  LogicRule,
  LogicRuleAction,
  LogicAction,
  BuilderField,
  LogicValueSource,
} from "./form-types";
import { LOGIC_ACTION_META, LOGIC_OPERATOR_META, isNavTrigger, navTriggerSectionId } from "./form-types";

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
  kind: "page" | "section" | "field" | "url";
  targetPageIndex?: number;
  targetSectionId?: string;
  targetFieldId?: string;
  targetUrl?: string;
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

/** Flatten a grid answer (Record<string, string | string[]>) into all selected column values. */
function gridValues(v: FormAnswer): string[] | null {
  if (v === null || v === undefined || typeof v !== "object" || Array.isArray(v)) return null;
  const vals: string[] = [];
  for (const rowVal of Object.values(v)) {
    if (Array.isArray(rowVal)) {
      vals.push(...rowVal.map((s) => String(s).toLowerCase()));
    } else if (rowVal) {
      vals.push(String(rowVal).toLowerCase());
    }
  }
  return vals;
}

/** Check if a specific row (or any row if rowValue is empty/__any__) contains the column value (or any column if columnValue is empty). */
function gridRowContains(
  gridAnswer: FormAnswer,
  columnValue: FormAnswer,
  rowValue: FormAnswer
): boolean | null {
  if (gridAnswer === null || gridAnswer === undefined || typeof gridAnswer !== "object" || Array.isArray(gridAnswer)) {
    return null;
  }
  const grid = gridAnswer as Record<string, string | string[]>;
  const colNeedle = String(columnValue ?? "").toLowerCase();
  const anyColumn = colNeedle === "" || colNeedle === "__any__";
  const specificRow = String(rowValue ?? "").toLowerCase();
  const anyRow = specificRow === "" || specificRow === "__any__";

  // Case 1: Specific row + Specific column
  if (!anyRow && !anyColumn) {
    const rowAnswer = grid[specificRow];
    if (rowAnswer === undefined || rowAnswer === null) return false;
    if (Array.isArray(rowAnswer)) {
      return rowAnswer.some((v) => String(v).toLowerCase() === colNeedle);
    }
    return String(rowAnswer).toLowerCase() === colNeedle;
  }

  // Case 2: Specific row + Any column (row is answered)
  if (!anyRow && anyColumn) {
    const rowAnswer = grid[specificRow];
    if (rowAnswer === undefined || rowAnswer === null) return false;
    if (Array.isArray(rowAnswer)) return rowAnswer.length > 0;
    return rowAnswer !== "";
  }

  // Case 3: Any row + Specific column (column selected anywhere)
  if (anyRow && !anyColumn) {
    for (const rowVal of Object.values(grid)) {
      if (rowVal === undefined || rowVal === null) continue;
      if (Array.isArray(rowVal)) {
        if (rowVal.some((v) => String(v).toLowerCase() === colNeedle)) return true;
      } else if (String(rowVal).toLowerCase() === colNeedle) {
        return true;
      }
    }
    return false;
  }

  // Case 4: Any row + Any column (grid has any answer)
  for (const rowVal of Object.values(grid)) {
    if (rowVal === undefined || rowVal === null) continue;
    if (Array.isArray(rowVal)) {
      if (rowVal.length > 0) return true;
    } else if (rowVal !== "") {
      return true;
    }
  }
  return false;
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
  if (typeof v === "object") return Object.keys(v).length === 0;
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
  answers: Record<string, FormAnswer>,
  activeSectionId?: string,
): boolean {
  // Nav-trigger conditions match when the user clicks Next/Submit on that section
  if (isNavTrigger(condition.fieldId)) {
    return activeSectionId === navTriggerSectionId(condition.fieldId);
  }

  const actual = answers[condition.fieldId];
  const { operator, value, value2 } = condition;

  switch (operator) {
    case "empty":
      return isAnswerEmpty(actual);
    case "filled":
      return !isAnswerEmpty(actual);

    case "equal": {
      const gridResult = gridRowContains(actual, value ?? null, value2 ?? null);
      if (gridResult !== null) return gridResult;
      return normalize(actual) === normalize(value ?? null);
    }
    case "not_equal": {
      const gridResult = gridRowContains(actual, value ?? null, value2 ?? null);
      if (gridResult !== null) return !gridResult;
      return normalize(actual) !== normalize(value ?? null);
    }

    case "contains": {
      const gridResult = gridRowContains(actual, value ?? null, value2 ?? null);
      if (gridResult !== null) return gridResult;
      const needle = String(value ?? "").toLowerCase();
      if (Array.isArray(actual)) {
        return actual.some((item) => String(item).toLowerCase().includes(needle));
      }
      return String(actual ?? "").toLowerCase().includes(needle);
    }
    case "not_contains": {
      const gridResult = gridRowContains(actual, value ?? null, value2 ?? null);
      if (gridResult !== null) return !gridResult;
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
  answers: Record<string, FormAnswer>,
  activeSectionId?: string,
): boolean {
  const combinator = group.combinator ?? "and";
  const results: boolean[] = [];

  for (const cond of group.conditions ?? []) {
    results.push(evaluateCondition(cond, answers, activeSectionId));
  }

  for (const sub of group.groups ?? []) {
    results.push(evaluateConditionGroup(sub, answers, activeSectionId));
  }

  if (results.length === 0) return true; // vacuously true — "always match"
  return combinator === "and" ? results.every(Boolean) : results.some(Boolean);
}

/**
 * Migrates old single-action rules to the new multi-action format.
 * Existing saved data may have `action` + top-level targets instead of `actions[]`.
 */
export function migrateRule(rule: LogicRule): LogicRule {
  if (rule.actions && rule.actions.length > 0) return rule;
  // Old format: single action at top level
  const legacyAction = (rule as any).action as LogicAction | undefined;
  if (!legacyAction) {
    return { ...rule, actions: [] };
  }
  const migrated: LogicRuleAction = {
    id: crypto.randomUUID(),
    action: legacyAction,
    targetFieldIds: rule.targetFieldIds,
    targetSectionId: rule.targetSectionId,
    targetPageIndex: rule.targetPageIndex,
    targetFieldId: rule.targetFieldId,
    valueSource: rule.valueSource,
  };
  return { ...rule, actions: [migrated] };
}

function resolveValue(
  ruleAction: LogicRuleAction,
  answers: Record<string, FormAnswer>
): FormAnswer | undefined {
  const src = ruleAction.valueSource;
  if (!src) return undefined;

  if (src.mode === "static") return src.staticValue;
  if (src.mode === "copy_field") return answers[src.sourceFieldId ?? ""] ?? null;

  if (src.mode === "formula") {
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

function applyAction(
  ruleAction: LogicRuleAction,
  states: Record<string, FieldDynamicState>,
  answers: Record<string, FormAnswer>,
  warnings: string[],
  ruleName: string,
): NavigationOverride | undefined {
  const targets = ruleAction.targetFieldIds ?? [];
  switch (ruleAction.action) {
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
      const v = resolveValue(ruleAction, answers);
      for (const t of targets) if (states[t]) states[t].overriddenValue = v;
      break;
    }
    case "skip_to_page":
      if (typeof ruleAction.targetPageIndex === "number") {
        return { kind: "page", targetPageIndex: ruleAction.targetPageIndex };
      }
      break;
    case "skip_to_section":
      if (ruleAction.targetSectionId) {
        return { kind: "section", targetSectionId: ruleAction.targetSectionId };
      }
      break;
    case "jump_to_field":
      if (ruleAction.targetFieldId) {
        return { kind: "field", targetFieldId: ruleAction.targetFieldId };
      }
      break;
    case "redirect_to_url":
      if (ruleAction.targetUrl) {
        return { kind: "url", targetUrl: ruleAction.targetUrl };
      }
      break;
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
  answers: Record<string, FormAnswer>,
  activeSectionId?: string,
): EngineResult {
  const states: Record<string, FieldDynamicState> = {};
  for (const f of fields) states[f.id] = baselineState(f);

  const warnings: string[] = [];
  let navigation: NavigationOverride | undefined;

  const sorted = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  for (const rawRule of sorted) {
    const rule = migrateRule(rawRule);
    let matched = true;
    try {
      matched = evaluateConditionGroup(rule.conditions, answers, activeSectionId);
    } catch (err) {
      warnings.push(`Rule "${rule.name ?? rule.id}" failed: ${(err as Error).message}`);
      matched = false;
    }
    if (!matched) continue;

    for (const ruleAction of rule.actions) {
      const nav = applyAction(ruleAction, states, answers, warnings, rule.name ?? rule.id);
      if (nav) navigation = nav;
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

  for (const rawRule of rules) {
    const rule = migrateRule(rawRule);
    const ruleName = rule.name ?? "Untitled";

    // Missing condition fields
    const used = new Set<string>();
    collectConditionFieldIds(rule.conditions, used);
    for (const id of used) {
      if (isNavTrigger(id)) continue; // synthetic nav-trigger IDs are not real fields
      if (!fieldIds.has(id)) {
        issues.push({
          severity: "error",
          ruleId: rule.id,
          message: `Rule "${ruleName}" references a deleted field in its conditions`,
        });
      } else {
        const f = fieldById.get(id);
        if (f && ["paragraph", "divider", "video"].includes(f.type)) {
          issues.push({
            severity: "error",
            ruleId: rule.id,
            message: `Rule "${ruleName}" uses "${f.label}" (${f.type}) as a condition source, but it has no value`,
          });
        }
      }
    }

    if (rule.actions.length === 0) {
      issues.push({
        severity: "error",
        ruleId: rule.id,
        message: `Rule "${ruleName}" has no actions`,
      });
    }

    for (const ruleAction of rule.actions) {
      const needsTargets = actionNeedsTargets(ruleAction.action);

      if (needsTargets) {
        const targets = ruleAction.targetFieldIds ?? [];
        if (targets.length === 0) {
          issues.push({
            severity: "error",
            ruleId: rule.id,
            message: `Rule "${ruleName}" (${actionLabel(ruleAction.action)}) has no target field`,
          });
        }
        for (const t of targets) {
          if (!fieldIds.has(t)) {
            issues.push({
              severity: "error",
              ruleId: rule.id,
              fieldId: t,
              message: `Rule "${ruleName}" (${actionLabel(ruleAction.action)}) targets a deleted field`,
            });
          } else {
            const targetField = fieldById.get(t);
            const visualOnlyActions: LogicAction[] = ["show_field", "hide_field"];
            if (targetField && !visualOnlyActions.includes(ruleAction.action) && ["paragraph", "divider", "video"].includes(targetField.type)) {
              issues.push({
                severity: "error",
                ruleId: rule.id,
                fieldId: t,
                message: `Field "${targetField.label}" (${targetField.type}) cannot be targeted by ${actionLabel(ruleAction.action)}`,
              });
            }
            if (!actionsByTarget.has(t)) actionsByTarget.set(t, new Set());
            actionsByTarget.get(t)!.add(ruleAction.action);
          }
        }
      }

      // Navigation targets
      if (ruleAction.action === "skip_to_page" && typeof ruleAction.targetPageIndex !== "number") {
        issues.push({ severity: "error", ruleId: rule.id, message: `"Skip to page" has no destination set` });
      }
      if (ruleAction.action === "skip_to_section" && !ruleAction.targetSectionId) {
        issues.push({ severity: "error", ruleId: rule.id, message: `"Skip to section" has no destination set` });
      }
      if (ruleAction.action === "jump_to_field") {
        if (!ruleAction.targetFieldId) {
          issues.push({ severity: "error", ruleId: rule.id, message: `"Scroll to field" has no destination set` });
        } else if (!fieldIds.has(ruleAction.targetFieldId)) {
          issues.push({ severity: "error", ruleId: rule.id, message: `"Scroll to field" references a deleted field` });
        }
      }

      if (ruleAction.action === "redirect_to_url" && !ruleAction.targetUrl?.trim()) {
        issues.push({ severity: "error", ruleId: rule.id, message: `"Redirect to URL" has no URL set` });
      }

      // set_value — reject circular copy (field copying itself)
      if (ruleAction.action === "set_value" && ruleAction.valueSource?.mode === "copy_field") {
        const src = ruleAction.valueSource.sourceFieldId;
        if (src && (ruleAction.targetFieldIds ?? []).includes(src)) {
          issues.push({
            severity: "error",
            ruleId: rule.id,
            message: `Rule "${ruleName}" copies a field into itself`,
          });
        }
        if (src && !fieldIds.has(src)) {
          issues.push({
            severity: "error",
            ruleId: rule.id,
            message: `Rule "${ruleName}" copies from a deleted field`,
          });
        }
      }
    }

    // Empty condition group (always matches — warning)
    if ((rule.conditions.conditions?.length ?? 0) === 0 && (rule.conditions.groups?.length ?? 0) === 0) {
      issues.push({
        severity: "warning",
        ruleId: rule.id,
        message: `Rule "${ruleName}" has no conditions and will always run`,
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

export function createEmptyRuleAction(): LogicRuleAction {
  return {
    id: crypto.randomUUID(),
    action: "hide_field",
    targetFieldIds: [],
  };
}

export function createEmptyRule(orderIndex: number): LogicRule {
  return {
    id: crypto.randomUUID(),
    name: "New rule",
    enabled: true,
    orderIndex,
    actions: [createEmptyRuleAction()],
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
