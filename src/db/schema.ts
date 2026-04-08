import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  jsonb,
  uuid,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const formStatusEnum = pgEnum("form_status", [
  "draft",
  "active",
  "closed",
]);

export const fieldTypeEnum = pgEnum("field_type", [
  "short_text",
  "long_text",
  "number",
  "email",
  "phone",
  "url",
  "date",
  "time",
  "datetime",
  "select",
  "multi_select",
  "checkbox",
  "radio",
  "rating",
  "scale",
  "file",
  "section",
  "page_break",
]);

// ─── Users (mirrors Supabase auth.users) ─────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // maps to auth.users.id
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Forms ────────────────────────────────────────────────────────────────────

export const forms = pgTable(
  "forms",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled Form"),
    description: text("description"),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    status: formStatusEnum("status").notNull().default("draft"),
    accentColor: varchar("accent_color", { length: 7 }).notNull().default("#6366f1"),
    acceptResponses: boolean("accept_responses").notNull().default(true),
    requireAuth: boolean("require_auth").notNull().default(false),
    showProgress: boolean("show_progress").notNull().default(true),
    oneResponsePerUser: boolean("one_response_per_user").notNull().default(false),
    successMessage: text("success_message")
      .notNull()
      .default("Thank you for your response!"),
    redirectUrl: text("redirect_url"),
    autoSave: boolean("auto_save").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("forms_user_id_idx").on(table.userId)]
);

// ─── Form Fields ──────────────────────────────────────────────────────────────

export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    type: fieldTypeEnum("type").notNull(),
    label: text("label").notNull().default("Untitled Question"),
    description: text("description"),
    placeholder: text("placeholder"),
    required: boolean("required").notNull().default(false),
    orderIndex: integer("order_index").notNull().default(0),
    // For choice fields: [{label: string, value: string}]
    options: jsonb("options").$type<{ label: string; value: string }[]>(),
    // Validation rules: {min, max, minLength, maxLength, pattern}
    validation: jsonb("validation").$type<{
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      step?: number;
    }>(),
    // Field-specific properties
    properties: jsonb("properties").$type<{
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
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("form_fields_form_id_idx").on(table.formId),
    index("form_fields_order_idx").on(table.formId, table.orderIndex),
  ]
);

// ─── Form Responses ───────────────────────────────────────────────────────────

export const formResponses = pgTable(
  "form_responses",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    respondentId: varchar("respondent_id"), // auth user ID if required
    respondentEmail: text("respondent_email"),
    // { [fieldId]: value }
    answers: jsonb("answers")
      .notNull()
      .$type<Record<string, string | string[] | number | boolean | null>>(),
    // Browser info, time taken (seconds), etc.
    metadata: jsonb("metadata").$type<{
      timeTaken?: number;
      userAgent?: string;
      ipHash?: string;
    }>(),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (table) => [
    index("form_responses_form_id_idx").on(table.formId),
    index("form_responses_submitted_at_idx").on(table.formId, table.submittedAt),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  forms: many(forms),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  user: one(users, { fields: [forms.userId], references: [users.id] }),
  fields: many(formFields),
  responses: many(formResponses),
}));

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  form: one(forms, { fields: [formFields.formId], references: [forms.id] }),
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  form: one(forms, { fields: [formResponses.formId], references: [forms.id] }),
}));

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type FormField = typeof formFields.$inferSelect;
export type FormResponse = typeof formResponses.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type NewFormField = typeof formFields.$inferInsert;
export type NewFormResponse = typeof formResponses.$inferInsert;
