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
import type { BuilderField, BuilderForm, BuilderSection } from "@/lib/form-types";
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
    isDragging,
    currentSectionId,
    setCurrentSectionId,
    selectedSectionId,
    selectSection,
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
  const sections = useStorage((root) => root.sections) as unknown as BuilderSection[];

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

  const addSection = useMutation(({ storage }, section: BuilderSection) => {
    const list = storage.get("sections");
    list.push(new LiveObject<BuilderSection>(section));
  }, []);

  const removeSection = useMutation(({ storage }, id: string) => {
    const list = storage.get("sections");
    const index = list.findIndex((s) => (s as LiveObject<BuilderSection>).get("id") === id);
    if (index !== -1) list.delete(index);
  }, []);

  const updateSection = useMutation(({ storage }, id: string, changes: Partial<BuilderSection>) => {
    const list = storage.get("sections");
    const section = list.find((s) => (s as LiveObject<BuilderSection>).get("id") === id) as LiveObject<BuilderSection> | undefined;
    if (section) {
      for (const [key, value] of Object.entries(changes)) {
        section.set(key as keyof BuilderSection, value);
      }
    }
  }, []);

  const duplicateSection = useMutation(({ storage }, id: string) => {
    const fieldsList = storage.get("fields");
    const sectionsList = storage.get("sections");
    const srcSection = sectionsList.find((s) => (s as LiveObject<BuilderSection>).get("id") === id) as LiveObject<BuilderSection> | undefined;
    if (!srcSection) return;

    const newSectionId = crypto.randomUUID();
    const newSection: BuilderSection = {
      id: newSectionId,
      name: `${srcSection.get("name")} (Copy)`,
      description: srcSection.get("description") ?? "",
      orderIndex: sectionsList.length,
    };
    sectionsList.push(new LiveObject<BuilderSection>(newSection));

    const srcFieldKeys: string[] = ["type","label","description","placeholder","required","orderIndex","options","validation","properties","lockedBy","isDirty","isNew"];
    const srcFields: Record<string, unknown>[] = [];
    for (let i = 0; i < fieldsList.length; i++) {
      const f = fieldsList.get(i) as LiveObject<BuilderField>;
      if (f.get("sectionId") === id) {
        const snapshot: Record<string, unknown> = {};
        for (const k of srcFieldKeys) {
          snapshot[k] = f.get(k as keyof BuilderField);
        }
        srcFields.push(snapshot);
      }
    }
    for (const f of srcFields) {
      fieldsList.push(new LiveObject<BuilderField>({ ...f, id: crypto.randomUUID(), sectionId: newSectionId, isNew: true } as BuilderField));
    }
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

  // ─── Initial Metadata Sync ────────────────────────────────────────────────
  // On mount, if the storage metadata differs from the DB truth (initialForm),
  // we force a sync to Liveblocks. This prevents stale storage resets.
  useEffect(() => {
    if (!form || !initialForm) return;

    const fieldsToSync: (keyof BuilderForm)[] = [
      "status", "accentColor", "acceptResponses", "requireAuth", 
      "showProgress", "oneResponsePerUser", "successMessage", 
      "redirectUrl", "title", "description", "slug"
    ];

    const changes: Partial<BuilderForm> = {};
    let hasChanges = false;

    for (const key of fieldsToSync) {
      if (form[key] !== initialForm[key] && initialForm[key] !== undefined) {
        changes[key] = initialForm[key] as any;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      updateFormMeta(changes);
    }
    // We only want to run this once when the form becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!form]);

  return {
    fields: fields || [],
    form: form || initialForm,
    sections: sections || [],
    others,
    self,
    myPresence,
    updateMyPresence,
    addField,
    removeField,
    updateField,
    reorderFields,
    updateFormMeta,
    addSection,
    removeSection,
    updateSection,
    duplicateSection,
    selectField,
    selectedFieldId,
    isDragging,
    currentSectionId,
    setCurrentSectionId,
    selectedSectionId,
    selectSection,
  };
}
