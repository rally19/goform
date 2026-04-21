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
  initialSections?: BuilderSection[];
}

export function useFormCollaboration({
  formId,
  initialForm,
  initialFields,
  initialSections,
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
      selectedSectionId,
      draggingFieldId: isDragging ? selectedFieldId : null
    });
  }, [selectedFieldId, selectedSectionId, isDragging, updateMyPresence]);

  // ─── Storage Access ───────────────────────────────────────────────────────
  // useStorage returns an immutable readonly snapshot typed via liveblocks.config.ts.
  // We use shallow selectors to avoid re-rendering on unrelated storage changes.
  const fields = useStorage((root) => root.fields) as unknown as BuilderField[] | null;
  const form = useStorage((root) => root.formMetadata) as unknown as BuilderForm | null;
  const sections = useStorage((root) => root.sections) as unknown as BuilderSection[] | null;

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

  // ─── One-time field→section reconciliation ──────────────────────────────
  // Runs once when sections + fields are first available from Liveblocks.
  // Patches fields that have no sectionId (created before sections existed)
  // by assigning them to the first section. Also restores sections from DB
  // if the Liveblocks sections list is somehow empty.
  const reconcileStorage = useMutation(({ storage }, seedSections: BuilderSection[]) => {
    const sectionsList = storage.get("sections");
    const fieldsList = storage.get("fields");
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Replace any section with a non-UUID id (e.g. "default") with a valid UUID
    for (let i = 0; i < sectionsList.length; i++) {
      const s = sectionsList.get(i) as LiveObject<BuilderSection>;
      const sid = s.get("id");
      if (!uuidRe.test(sid)) {
        s.set("id", crypto.randomUUID());
      }
    }

    // If Liveblocks still has no valid sections, seed from DB or create a default
    if (sectionsList.length === 0) {
      const toSeed: BuilderSection[] = seedSections.length > 0
        ? seedSections.map((s) => ({ ...s, id: uuidRe.test(s.id) ? s.id : crypto.randomUUID() }))
        : [{ id: crypto.randomUUID(), name: "Section 1", description: "", orderIndex: 0 }];
      for (const s of toSeed) {
        sectionsList.push(new LiveObject<BuilderSection>(s));
      }
    }

    // Determine the valid section IDs after reconciliation
    const validIds = new Set<string>();
    for (let i = 0; i < sectionsList.length; i++) {
      validIds.add((sectionsList.get(i) as LiveObject<BuilderSection>).get("id"));
    }

    if (validIds.size === 0) return;
    const firstSectionId = (sectionsList.get(0) as LiveObject<BuilderSection>).get("id");

    // Patch fields that have no sectionId, a non-UUID sectionId, or an orphaned sectionId
    for (let i = 0; i < fieldsList.length; i++) {
      const f = fieldsList.get(i) as LiveObject<BuilderField>;
      const sid = f.get("sectionId");
      if (!sid || !uuidRe.test(sid) || !validIds.has(sid)) {
        f.set("sectionId", firstSectionId);
      }
    }
  }, []);

  const reorderSection = useMutation(({ storage }, id: string, toIndex: number) => {
    const list = storage.get("sections");
    // Build a sorted snapshot of [liveObject, orderIndex] pairs
    const items: { obj: LiveObject<BuilderSection>; orderIndex: number }[] = [];
    for (let i = 0; i < list.length; i++) {
      const obj = list.get(i) as LiveObject<BuilderSection>;
      items.push({ obj, orderIndex: obj.get("orderIndex") });
    }
    items.sort((a, b) => a.orderIndex - b.orderIndex);

    const fromIndex = items.findIndex((item) => item.obj.get("id") === id);
    if (fromIndex === -1 || fromIndex === toIndex) return;
    const clampedTo = Math.max(0, Math.min(toIndex, items.length - 1));

    // Proper arrayMove: remove from old position, insert at new position
    const [moved] = items.splice(fromIndex, 1);
    items.splice(clampedTo, 0, moved);

    // Reassign sequential orderIndex values so sorting is always deterministic
    items.forEach((item, idx) => {
      item.obj.set("orderIndex", idx);
    });
  }, []);

  const duplicateSection = useMutation(({ storage }, id: string, newSectionId: string) => {
    const fieldsList = storage.get("fields");
    const sectionsList = storage.get("sections");
    const srcSection = sectionsList.find((s) => (s as LiveObject<BuilderSection>).get("id") === id) as LiveObject<BuilderSection> | undefined;
    if (!srcSection) return;

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

  const persistToSupabase = useCallback(async (currentFields: BuilderField[], currentForm: BuilderForm, currentSections: BuilderSection[]) => {
    const payload = JSON.stringify({ currentFields, currentForm, currentSections });
    
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

      const result = await syncFormState(formId, currentFields, currentForm, false, currentSections);

      if (!result.success) throw new Error(result.error);

      lastSavedRef.current = payload;
    } catch (err) {
      console.error("Auto-save to Supabase failed:", err);
    } finally {
      isSavingRef.current = false;
      
      // If changes happened while we were saving, trigger another save immediately
      // BUT ONLY if we are still mounted!
      if (isDirtyRef.current && mountedRef.current && fields && form) {
        persistToSupabase(fields, form, sections ?? []);
      }
    }
  }, [formId, fields, form, sections]);

  // ─── One-time reconciliation on mount ────────────────────────────────────
  // Runs once when Liveblocks storage first becomes available. Patches any
  // fields that are missing a sectionId (e.g. undefined or "default")
  // and seeds sections from DB if Liveblocks has none stored yet.
  const reconciledRef = useRef(false);
  const reconcileDoneRef = useRef(false);
  const fieldsReady = fields !== null;
  const sectionsReady = sections !== null;
  useEffect(() => {
    if (reconciledRef.current) return;
    if (!fieldsReady || !sectionsReady) return;
    reconciledRef.current = true;
    reconcileStorage(initialSections ?? []);
    reconcileDoneRef.current = true;
  // reconcileStorage is stable (useMutation with [] deps); initialSections is stable from props
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsReady, sectionsReady]);

  useEffect(() => {
    if (!fields || !form) return;
    // Wait for reconciliation to complete before saving, to avoid persisting
    // stale sectionId values (e.g. undefined or "default") from old Liveblocks rooms
    if (!reconcileDoneRef.current) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistToSupabase(fields, form, sections ?? []);
    }, 3000);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [fields, form, sections, persistToSupabase]);

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
    reorderSection,
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
