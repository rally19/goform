import type { BuilderForm } from "@/lib/form-types";

/**
 * Maps snake_case database columns from the public.forms table 
 * back to the camelCase BuilderForm interface used in the UI.
 */
export function mapFormUpdate(newDoc: Record<string, any>): Partial<BuilderForm> {
  const mapped: Partial<BuilderForm> = {};

  if ("id" in newDoc) mapped.id = newDoc.id;
  if ("title" in newDoc) mapped.title = newDoc.title;
  if ("description" in newDoc) mapped.description = newDoc.description;
  if ("slug" in newDoc) mapped.slug = newDoc.slug;
  if ("status" in newDoc) mapped.status = newDoc.status;
  if ("accent_color" in newDoc) mapped.accentColor = newDoc.accent_color;
  if ("accept_responses" in newDoc) mapped.acceptResponses = newDoc.accept_responses;
  if ("require_auth" in newDoc) mapped.requireAuth = newDoc.require_auth;
  if ("show_progress" in newDoc) mapped.showProgress = newDoc.show_progress;
  if ("one_response_per_user" in newDoc) mapped.oneResponsePerUser = newDoc.one_response_per_user;
  if ("success_message" in newDoc) mapped.successMessage = newDoc.success_message;
  if ("redirect_url" in newDoc) mapped.redirectUrl = newDoc.redirect_url;
  if ("auto_save" in newDoc) mapped.autoSave = newDoc.auto_save;
  if ("collaboration_enabled" in newDoc) mapped.collaborationEnabled = newDoc.collaboration_enabled;
  if ("last_toggled_by" in newDoc) mapped.lastToggledBy = newDoc.last_toggled_by;

  return mapped;
}

/**
 * Maps snake_case database columns from the public.form_fields table
 * back to the camelCase BuilderField interface.
 */
export function mapFieldUpdate(newDoc: Record<string, any>): any {
  const mapped: any = {
    id: newDoc.id,
    label: newDoc.label ?? "Untitled Question",
    type: newDoc.type,
    required: !!newDoc.required,
    placeholder: newDoc.placeholder ?? undefined,
    description: newDoc.description ?? undefined,
    order: newDoc.order_index ?? newDoc.order ?? 0,
    properties: newDoc.properties ?? {},
    options: newDoc.options ?? [],
    locked_by: newDoc.locked_by ?? undefined
  };

  return mapped;
}
