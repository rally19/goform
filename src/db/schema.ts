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
  serial,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const formStatusEnum = pgEnum("form_status", [
  "draft",
  "active",
  "closed",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "image",
  "video",
  "document",
  "audio",
  "other",
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

export const organizationRoleEnum = pgEnum("organization_role", [
  "owner",
  "manager",
  "administrator",
  "editor",
  "viewer",
]);

// ─── Users (mirrors Supabase auth.users) ─────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // maps to auth.users.id
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── API Keys ───────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [index("api_keys_user_id_idx").on(table.userId)]
);

// ─── Organizations ────────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  ownerDeletedAt: timestamp("owner_deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: organizationRoleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("org_members_org_id_idx").on(table.organizationId),
    index("org_members_user_id_idx").on(table.userId),
  ]
);

export const organizationInvites = pgTable(
  "organization_invites",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: organizationRoleEnum("role").notNull().default("viewer"),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("org_invites_org_id_idx").on(table.organizationId),
    index("org_invites_email_idx").on(table.email),
    index("org_invites_token_idx").on(table.token),
  ]
);

// ─── Forms ────────────────────────────────────────────────────────────────────

export const forms = pgTable(
  "forms",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" }),
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
    collaborationEnabled: boolean("collaboration_enabled").notNull().default(false),
    lastToggledBy: text("last_toggled_by"),
    sections: jsonb("sections").$type<{ id: string; name: string; description: string; orderIndex: number }[]>().notNull().default([]),
    logic: jsonb("logic").$type<unknown[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("forms_user_id_idx").on(table.userId),
    index("forms_org_id_idx").on(table.organizationId),
  ]
);

// ─── Active Form Sessions (Database Realtime Presence) ───────────────────────

export const activeFormSessions = pgTable(
  "active_form_sessions",
  {
    id: text("id").primaryKey(), // We use `${formId}_${presenceKey}`
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    presenceKey: text("presence_key").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    color: text("color").notNull(),
    selectedFieldId: uuid("selected_field_id"),
    selectedFieldIdText: text("selected_field_id_text"), 
    lastPing: timestamp("last_ping").defaultNow().notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    serialId: serial("serial_id").notNull(),
  },
  (table) => [
    index("active_form_sessions_form_id_idx").on(table.formId),
    index("active_form_sessions_last_ping_idx").on(table.lastPing),
    index("active_form_sessions_joined_at_idx").on(table.joinedAt),
  ]
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
      maxFiles?: number;
      acceptedTypes?: string[];
      maxFileSize?: number;
    }>(),
    // Section this field belongs to
    sectionId: uuid("section_id"),
    // Realtime locking - user ID of who is editing this field
    lockedBy: text("locked_by"),
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

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assets = pgTable(
  "assets",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // Workspace ownership — exactly one of these is set
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    // File metadata
    name: text("name").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(), // bytes
    type: assetTypeEnum("type").notNull().default("other"),
    // Supabase storage path (bucket key)
    storagePath: text("storage_path").notNull(),
    // Public URL for direct access
    url: text("url").notNull(),
    // Optional alt text / description
    altText: text("alt_text"),
    // Uploaded by
    uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("assets_user_id_idx").on(table.userId),
    index("assets_org_id_idx").on(table.organizationId),
    index("assets_type_idx").on(table.type),
    index("assets_created_at_idx").on(table.createdAt),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  forms: many(forms),
  organizationMemberships: many(organizationMembers),
  assets: many(assets),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invites: many(organizationInvites),
  forms: many(forms),
  assets: many(assets),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const organizationInvitesRelations = relations(organizationInvites, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvites.organizationId],
    references: [organizations.id],
  }),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  user: one(users, { fields: [forms.userId], references: [users.id] }),
  organization: one(organizations, { fields: [forms.organizationId], references: [organizations.id] }),
  fields: many(formFields),
  responses: many(formResponses),
}));

export const formFieldsRelations = relations(formFields, ({ one }) => ({
  form: one(forms, { fields: [formFields.formId], references: [forms.id] }),
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  form: one(forms, { fields: [formResponses.formId], references: [forms.id] }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  user: one(users, { fields: [assets.userId], references: [users.id] }),
  organization: one(organizations, { fields: [assets.organizationId], references: [organizations.id] }),
  uploader: one(users, { fields: [assets.uploadedBy], references: [users.id] }),
}));

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type FormField = typeof formFields.$inferSelect;
export type FormResponse = typeof formResponses.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type NewFormField = typeof formFields.$inferInsert;
export type NewFormResponse = typeof formResponses.$inferInsert;
export type NewAsset = typeof assets.$inferInsert;
