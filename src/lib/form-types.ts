import type { FormField } from "@/db/schema";

// ─── Field Type Definitions ──────────────────────────────────────────────────

export type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "date"
  | "time"
  | "datetime"
  | "select"
  | "multi_select"
  | "checkbox"
  | "radio"
  | "rating"
  | "scale"
  | "file"
  | "section"
  | "page_break"
  | "paragraph"
  | "divider";

export type FieldCategory =
  | "text"
  | "contact"
  | "datetime"
  | "choice"
  | "scale"
  | "visual"
  | "media";

export interface FieldTypeMeta {
  type: FieldType;
  label: string;
  icon: string;
  category: FieldCategory;
  description: string;
  defaultLabel: string;
  defaultProperties?: FormField["properties"];
  defaultOptions?: { label: string; value: string }[];
}

export const FIELD_TYPE_META: FieldTypeMeta[] = [
  // Text
  {
    type: "short_text",
    label: "Short Answer",
    icon: "Type",
    category: "text",
    description: "Single-line text input",
    defaultLabel: "Short Answer",
  },
  {
    type: "long_text",
    label: "Long Answer",
    icon: "AlignLeft",
    category: "text",
    description: "Multi-line text area",
    defaultLabel: "Long Answer",
    defaultProperties: { rows: 4 },
  },
  {
    type: "number",
    label: "Number",
    icon: "Hash",
    category: "text",
    description: "Numeric input with optional min/max",
    defaultLabel: "Number",
  },
  // Contact
  {
    type: "email",
    label: "Email",
    icon: "Mail",
    category: "contact",
    description: "Email address with validation",
    defaultLabel: "Email Address",
  },
  {
    type: "phone",
    label: "Phone",
    icon: "Phone",
    category: "contact",
    description: "Phone number input",
    defaultLabel: "Phone Number",
  },
  {
    type: "url",
    label: "Website",
    icon: "Link",
    category: "contact",
    description: "URL with validation",
    defaultLabel: "Website URL",
  },
  // Date/Time
  {
    type: "date",
    label: "Date",
    icon: "Calendar",
    category: "datetime",
    description: "Date picker",
    defaultLabel: "Date",
  },
  {
    type: "time",
    label: "Time",
    icon: "Clock",
    category: "datetime",
    description: "Time picker",
    defaultLabel: "Time",
  },
  {
    type: "datetime",
    label: "Date & Time",
    icon: "CalendarClock",
    category: "datetime",
    description: "Combined date and time picker",
    defaultLabel: "Date & Time",
  },
  // Choice
  {
    type: "radio",
    label: "Multiple Choice",
    icon: "CircleDot",
    category: "choice",
    description: "Select one from multiple options",
    defaultLabel: "Multiple Choice",
    defaultOptions: [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
      { label: "Option 3", value: "option_3" },
    ],
  },
  {
    type: "checkbox",
    label: "Checkboxes",
    icon: "CheckSquare",
    category: "choice",
    description: "Select multiple from options",
    defaultLabel: "Checkboxes",
    defaultOptions: [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
      { label: "Option 3", value: "option_3" },
    ],
  },
  {
    type: "select",
    label: "Dropdown",
    icon: "ChevronDown",
    category: "choice",
    description: "Dropdown list, select one",
    defaultLabel: "Dropdown",
    defaultOptions: [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
      { label: "Option 3", value: "option_3" },
    ],
  },
  {
    type: "multi_select",
    label: "Multi-Select",
    icon: "ListChecks",
    category: "choice",
    description: "Dropdown, select multiple",
    defaultLabel: "Multi-Select",
    defaultOptions: [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
      { label: "Option 3", value: "option_3" },
    ],
  },
  // Scale
  {
    type: "rating",
    label: "Star Rating",
    icon: "Star",
    category: "scale",
    description: "1–5 star rating",
    defaultLabel: "Rate your experience",
    defaultProperties: { stars: 5 },
  },
  {
    type: "scale",
    label: "Linear Scale",
    icon: "SlidersHorizontal",
    category: "scale",
    description: "Numeric scale e.g. 1–10",
    defaultLabel: "How likely are you to recommend us?",
    defaultProperties: {
      scaleMin: 1,
      scaleMax: 10,
      scaleMinLabel: "Not likely",
      scaleMaxLabel: "Very likely",
    },
  },
  // Visual
  {
    type: "paragraph",
    label: "Paragraph",
    icon: "TextQuote",
    category: "visual",
    description: "Display-only text block",
    defaultLabel: "Paragraph",
  },
  {
    type: "divider",
    label: "Divider",
    icon: "Minus",
    category: "visual",
    description: "Visual separator line",
    defaultLabel: "Divider",
  },
  {
    type: "section",
    label: "Section Header",
    icon: "Heading",
    category: "visual",
    description: "Add a section title",
    defaultLabel: "Section Title",
  },
  {
    type: "page_break",
    label: "Page Break",
    icon: "Columns2",
    category: "visual",
    description: "Split into multiple pages",
    defaultLabel: "Page Break",
  },
  // Media / File
  {
    type: "file",
    label: "File Upload",
    icon: "Upload",
    category: "media",
    description: "Allow file attachments",
    defaultLabel: "Upload File",
    defaultProperties: { maxFiles: 1, maxFileSize: 5000 },
  },
];

export const FIELD_CATEGORIES: {
  id: FieldCategory;
  label: string;
  icon: string;
}[] = [
  { id: "text", label: "Text", icon: "Type" },
  { id: "contact", label: "Contact", icon: "User" },
  { id: "datetime", label: "Date & Time", icon: "Calendar" },
  { id: "choice", label: "Choice", icon: "List" },
  { id: "scale", label: "Scale", icon: "BarChart2" },
  { id: "visual", label: "Visual", icon: "Eye" },
  { id: "media", label: "Media", icon: "Paperclip" },
];

// ─── Builder State Types ──────────────────────────────────────────────────────

export interface BuilderField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  orderIndex: number;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    step?: number;
  };
  properties?: {
    rows?: number;
    min?: number;
    max?: number;
    step?: number;
    stars?: number;
    scaleMin?: number;
    scaleMax?: number;
    scaleMinLabel?: string;
    scaleMaxLabel?: string;
    allowMultiple?: boolean;
    maxFiles?: number;
    acceptedTypes?: string[];
    maxFileSize?: number;
    // Default interactive state — used as a baseline for runtime state,
    // can be overridden by logic rules (enable/disable, mask/unmask).
    defaultDisabled?: boolean;
    defaultMasked?: boolean;
    defaultHidden?: boolean;
    // Add any other dynamic text like placeholder overwrites
    [key: string]: unknown;
  };
  // Section this field belongs to
  sectionId?: string;
  // Realtime Database Locked By userId
  lockedBy?: string | null;
  // dirty flag — needs to be saved
  isDirty?: boolean;
  // new flag — needs to be inserted
  isNew?: boolean;
  // Index signature for Liveblocks compatibility
  [key: string]: any;
}

export interface BuilderForm {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: "draft" | "active" | "closed";
  accentColor: string;
  acceptResponses: boolean;
  requireAuth: boolean;
  showProgress: boolean;
  oneResponsePerUser: boolean;
  successMessage: string;
  autoSave: boolean;
  collaborationEnabled: boolean;
  lastToggledBy?: string | null;
  submissionLimit?: number | null;
  submissionLimitEnabled: boolean;
  submissionLimitRemaining?: number | null;
  submissionLimitDecremental: boolean;
  startsAt?: string | null;
  startsAtEnabled: boolean;
  endsAt?: string | null;
  endsAtEnabled: boolean;
  showStartsAt: boolean;
  showEndsAt: boolean;
  logic?: LogicRule[];
  // Index signature for Liveblocks compatibility
  [key: string]: any;
}

// ─── Logic Types ──────────────────────────────────────────────────────────────

export type LogicAction =
  | "show_field"
  | "hide_field"
  | "enable_field"
  | "disable_field"
  | "require_field"
  | "unrequire_field"
  | "mask_field"
  | "unmask_field"
  | "set_value"
  | "skip_to_page"
  | "skip_to_section"
  | "jump_to_field"
  | "redirect_to_url";

export type LogicOperator =
  | "equal"
  | "not_equal"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "empty"
  | "filled"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "between"
  | "is_one_of"
  | "is_none_of";

export interface LogicCondition {
  id: string;
  fieldId: string;
  operator: LogicOperator;
  value?: FormAnswer;
  value2?: FormAnswer; // for "between"
}

export interface LogicConditionGroup {
  id: string;
  combinator: "and" | "or";
  conditions: LogicCondition[];
  groups?: LogicConditionGroup[]; // nested groups
}

export type LogicValueSource =
  | { mode: "static"; staticValue: FormAnswer }
  | { mode: "copy_field"; sourceFieldId: string }
  | { mode: "formula"; formula: string };

export interface LogicRuleAction {
  id: string;
  action: LogicAction;
  // Targets for field-scoped actions
  targetFieldIds?: string[];
  // For skip_to_section
  targetSectionId?: string;
  // For skip_to_page
  targetPageIndex?: number;
  // For jump_to_field
  targetFieldId?: string;
  // For set_value
  valueSource?: LogicValueSource;
  // For redirect_to_url
  targetUrl?: string;
}

export interface LogicRule {
  id: string;
  name?: string;
  enabled: boolean;
  /** @deprecated Use `actions` array instead. Kept for backward compatibility with existing data. */
  action?: LogicAction;
  orderIndex: number;
  // Multiple DO actions per rule
  actions: LogicRuleAction[];
  /** @deprecated Use actions[].targetFieldIds */
  targetFieldIds?: string[];
  /** @deprecated Use actions[].targetSectionId */
  targetSectionId?: string;
  /** @deprecated Use actions[].targetPageIndex */
  targetPageIndex?: number;
  /** @deprecated Use actions[].targetFieldId */
  targetFieldId?: string;
  /** @deprecated Use actions[].valueSource */
  valueSource?: LogicValueSource;
  // Condition tree
  conditions: LogicConditionGroup;
}

// Meta information about each action type — used in the UI & validation
export interface LogicActionMeta {
  action: LogicAction;
  label: string;
  description: string;
  category: "visibility" | "state" | "value" | "navigation";
  conflictsWith: LogicAction[]; // sibling actions that are mutually exclusive
}

export const LOGIC_ACTION_META: LogicActionMeta[] = [
  { action: "show_field", label: "Show field", description: "Make target field visible", category: "visibility", conflictsWith: ["hide_field"] },
  { action: "hide_field", label: "Hide field", description: "Hide target field", category: "visibility", conflictsWith: ["show_field"] },
  { action: "enable_field", label: "Enable field", description: "Allow user input", category: "state", conflictsWith: ["disable_field"] },
  { action: "disable_field", label: "Disable field", description: "Prevent user input", category: "state", conflictsWith: ["enable_field"] },
  { action: "require_field", label: "Require field", description: "Make field required", category: "state", conflictsWith: ["unrequire_field"] },
  { action: "unrequire_field", label: "Unrequire field", description: "Make field optional", category: "state", conflictsWith: ["require_field"] },
  { action: "mask_field", label: "Mask field", description: "Obscure input (like a password)", category: "state", conflictsWith: ["unmask_field"] },
  { action: "unmask_field", label: "Unmask field", description: "Reveal a masked field", category: "state", conflictsWith: ["mask_field"] },
  { action: "set_value", label: "Set / copy / calculate value", description: "Populate a field from another field, a formula, or a static value", category: "value", conflictsWith: [] },
  { action: "skip_to_page", label: "Skip to page", description: "Jump to a specific page on Next", category: "navigation", conflictsWith: ["skip_to_section"] },
  { action: "skip_to_section", label: "Skip to section", description: "Jump to a specific section on Next", category: "navigation", conflictsWith: ["skip_to_page"] },
  { action: "jump_to_field", label: "Scroll to field", description: "Scroll to a specific field", category: "navigation", conflictsWith: [] },
  { action: "redirect_to_url", label: "Redirect to URL", description: "Navigate the user to an external URL", category: "navigation", conflictsWith: [] },
];

export const LOGIC_OPERATOR_META: {
  operator: LogicOperator;
  label: string;
  requiresValue: boolean;
  requiresSecondValue?: boolean;
  // Which field types this operator applies to; undefined = any
  appliesTo?: FieldType[];
}[] = [
  { operator: "equal", label: "is equal to", requiresValue: true },
  { operator: "not_equal", label: "is not equal to", requiresValue: true },
  { operator: "empty", label: "is empty", requiresValue: false },
  { operator: "filled", label: "is filled", requiresValue: false },
  { operator: "contains", label: "contains", requiresValue: true, appliesTo: ["short_text", "long_text", "email", "phone", "url", "checkbox", "multi_select"] },
  { operator: "not_contains", label: "does not contain", requiresValue: true, appliesTo: ["short_text", "long_text", "email", "phone", "url", "checkbox", "multi_select"] },
  { operator: "starts_with", label: "starts with", requiresValue: true, appliesTo: ["short_text", "long_text", "email", "phone", "url"] },
  { operator: "ends_with", label: "ends with", requiresValue: true, appliesTo: ["short_text", "long_text", "email", "phone", "url"] },
  { operator: "greater_than", label: "is greater than", requiresValue: true, appliesTo: ["number", "rating", "scale", "date", "time", "datetime"] },
  { operator: "less_than", label: "is less than", requiresValue: true, appliesTo: ["number", "rating", "scale", "date", "time", "datetime"] },
  { operator: "greater_than_or_equal", label: "is ≥", requiresValue: true, appliesTo: ["number", "rating", "scale", "date", "time", "datetime"] },
  { operator: "less_than_or_equal", label: "is ≤", requiresValue: true, appliesTo: ["number", "rating", "scale", "date", "time", "datetime"] },
  { operator: "between", label: "is between", requiresValue: true, requiresSecondValue: true, appliesTo: ["number", "rating", "scale", "date", "time", "datetime"] },
  { operator: "is_one_of", label: "is one of", requiresValue: true, appliesTo: ["radio", "select", "short_text", "number"] },
  { operator: "is_none_of", label: "is none of", requiresValue: true, appliesTo: ["radio", "select", "short_text", "number"] },
];

// ─── Section Types ────────────────────────────────────────────────────────────

export type SectionType = "next" | "submit" | "success";

export const SECTION_TYPE_META: { type: SectionType; label: string; description: string }[] = [
  { type: "next", label: "Next", description: "Shows a \"Next\" button — advances to the next section" },
  { type: "submit", label: "Submit", description: "Shows a \"Submit\" button — submits the form" },
  { type: "success", label: "Success Page", description: "Displayed after form submission (no fields required)" },
];

/** Prefix used for synthetic "navigation button" field IDs in the logic condition picker. */
export const NAV_TRIGGER_PREFIX = "__nav_";
/** Build a synthetic field ID representing the Next/Submit button of a section. */
export function navTriggerId(sectionId: string) { return `${NAV_TRIGGER_PREFIX}${sectionId}`; }
/** Check whether a field ID is a nav-trigger synthetic ID. */
export function isNavTrigger(fieldId: string) { return fieldId.startsWith(NAV_TRIGGER_PREFIX); }
/** Extract the section ID from a nav-trigger synthetic ID. */
export function navTriggerSectionId(fieldId: string) { return fieldId.slice(NAV_TRIGGER_PREFIX.length); }

export interface BuilderSection {
  id: string;
  name: string;
  description?: string;
  orderIndex: number;
  /** 'next' = navigates to next section, 'submit' = submits form, 'success' = post-submit screen */
  type?: SectionType;
  /** For 'next' sections: the section to navigate to. undefined = next sequential non-success section. */
  nextSectionId?: string;
  // Index signature for Liveblocks compatibility
  [key: string]: any;
}

export type FormAnswer = string | string[] | number | boolean | null;

// ─── Response & Analytics Types ───────────────────────────────────────────────

export interface ResponseRow {
  id: string;
  formId: string;
  respondentEmail?: string | null;
  answers: Record<string, FormAnswer>;
  metadata?: {
    timeTaken?: number;
    userAgent?: string;
  } | null;
  submittedAt: Date;
}

export interface FormAnalytics {
  totalResponses: number;
  completionRate: number;
  avgTimeTaken: number; // seconds
  responsesOverTime: { date: string; count: number }[];
  fieldStats: FieldStat[];
}

export interface FieldStat {
  fieldId: string;
  label: string;
  type: FieldType;
  responseCount: number;
  // Choice fields
  optionCounts?: { label: string; count: number }[];
  // Numeric / rating
  average?: number;
  distribution?: { value: number; count: number }[];
  // Text fields
  avgLength?: number;
}

// ─── API Response Shape ───────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── ACCENT COLORS ────────────────────────────────────────────────────────────

export const ACCENT_COLORS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Emerald", value: "#10b981" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Slate", value: "#64748b" },
];
