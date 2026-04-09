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
  | "page_break";

export type FieldCategory =
  | "text"
  | "contact"
  | "datetime"
  | "choice"
  | "scale"
  | "layout"
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
  // Layout
  {
    type: "section",
    label: "Section Header",
    icon: "Heading",
    category: "layout",
    description: "Add a section title",
    defaultLabel: "Section Title",
  },
  {
    type: "page_break",
    label: "Page Break",
    icon: "Columns2",
    category: "layout",
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
    defaultProperties: { allowMultiple: false, maxFileSize: 10 },
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
  { id: "layout", label: "Layout", icon: "Layout" },
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
    acceptedTypes?: string[];
    maxFileSize?: number;
    // Add any other dynamic text like placeholder overwrites
    [key: string]: unknown;
  };
  // Realtime Database Locked By userId
  lockedBy?: string | null;
  // dirty flag — needs to be saved
  isDirty?: boolean;
  // new flag — needs to be inserted
  isNew?: boolean;
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
  redirectUrl?: string;
  autoSave: boolean;
  collaborationEnabled: boolean;
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
