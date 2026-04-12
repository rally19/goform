"use client";

import { useEffect, useRef, useCallback } from "react";
import { 
  useStorage, 
  useMutation, 
  useOthers, 
  useMyPresence,
  useSelf,
} from "@liveblocks/react";
import { LiveList, LiveObject } from "@liveblocks/client";
import { useFormBuilder } from "./use-form-builder";
import type { BuilderField, BuilderForm } from "@/lib/form-types";
import { syncFormState } from "@/lib/actions/forms";

interface UseFormCollaborationOptions {
  formId: string;
  initialForm: BuilderForm;
  initialFields: BuilderField[];
}

export function useFormCollaboration({
  formId,
  initialForm,
  initialFields,
}: UseFormCollaborationOptions) {
  const { 
    selectedFieldId, 
    selectField,
    isDragging 
  } = useFormBuilder();

  // ─── Presence ─────────────────────────────────────────────────────────────
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const self = useSelf();

  // Update presence when local Zustand state changes
  useEffect(() => {
    updateMyPresence({ 
      selectedFieldId,
      draggingFieldId: isDragging ? selectedFieldId : null
    });
  }, [selectedFieldId, isDragging, updateMyPresence]);

  // ─── Storage Access ───────────────────────────────────────────────────────
  // In Liveblocks 2.0, useStorage returns an immutable snapshot.
  const fields = useStorage((root) => root.fields) as unknown as BuilderField[];
  const form = useStorage((root) => root.formMetadata) as unknown as BuilderForm;

  // ─── Mutations ────────────────────────────────────────────────────────────
  
  const addField = useMutation(({ storage }, field: BuilderField, index?: number) => {
    const list = storage.get("fields");
    if (typeof index === "number") {
      list.insert(new LiveObject<BuilderField>(field), index);
    } else {
      list.push(new LiveObject<BuilderField>(field));
    }
  }, []);

  const removeField = useMutation(({ storage }, id: string) => {
    const list = storage.get("fields");
    const index = list.findIndex((f) => (f as LiveObject<BuilderField>).get("id") === id);
    if (index !== -1) {
      list.delete(index);
    }
  }, []);

  const updateField = useMutation(({ storage }, id: string, changes: Partial<BuilderField>) => {
    const list = storage.get("fields");
    const field = list.find((f) => (f as LiveObject<BuilderField>).get("id") === id) as LiveObject<BuilderField> | undefined;
    if (field) {
      for (const [key, value] of Object.entries(changes)) {
        field.set(key as keyof BuilderField, value);
      }
    }
  }, []);

  const reorderFields = useMutation(({ storage }, from: number, to: number) => {
    const list = storage.get("fields");
    list.move(from, to);
  }, []);

  const updateFormMeta = useMutation(({ storage }, changes: Partial<BuilderForm>) => {
    const meta = storage.get("formMetadata");
    if (meta) {
      for (const [key, value] of Object.entries(changes)) {
        meta.set(key as keyof BuilderForm, value);
      }
    }
  }, []);

  // ─── Persistence to Supabase ───────────────────────────────────────────────
  const lastSavedRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isSavingRef = useRef(false);
  const isDirtyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const killSync = () => {
      mountedRef.current = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };

    window.addEventListener("beforeunload", killSync);
    window.addEventListener("pagehide", killSync);

    return () => {
      killSync();
      window.removeEventListener("beforeunload", killSync);
      window.removeEventListener("pagehide", killSync);
    };
  }, []);

  const persistToSupabase = useCallback(async (currentFields: BuilderField[], currentForm: BuilderForm) => {
    const payload = JSON.stringify({ currentFields, currentForm });
    
    // Strict Path Sequestration: Ensure we are actually on the edit page for this form.
    // This prevents backgrounded tabs or transitioning states from firing syncs
    // that would trigger a router refresh on the wrong path (e.g., the dashboard).
    const isEditingThisForm = typeof window !== "undefined" && 
      window.location.pathname === `/forms/${formId}/edit`;

    if (payload === lastSavedRef.current || !mountedRef.current || !isEditingThisForm) return;

    if (isSavingRef.current) {
      isDirtyRef.current = true;
      return;
    }

    try {
      isSavingRef.current = true;
      isDirtyRef.current = false;

      const result = await syncFormState(formId, currentFields, currentForm, false);

      if (!result.success) throw new Error(result.error);

      lastSavedRef.current = payload;
    } catch (err) {
      console.error("Auto-save to Supabase failed:", err);
    } finally {
      isSavingRef.current = false;
      
      // If changes happened while we were saving, trigger another save immediately
      // BUT ONLY if we are still mounted!
      if (isDirtyRef.current && mountedRef.current) {
        persistToSupabase(fields, form);
      }
    }
  }, [formId, fields, form]);

  useEffect(() => {
    if (!fields || !form) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistToSupabase(fields, form);
    }, 3000);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [fields, form, persistToSupabase]);

  return {
    fields: fields || [],
    form: form || initialForm,
    others,
    self,
    myPresence,
    updateMyPresence,
    addField,
    removeField,
    updateField,
    reorderFields,
    updateFormMeta,
    selectField,
    selectedFieldId,
    isDragging,
  };
}
