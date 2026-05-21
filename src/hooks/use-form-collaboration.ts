"use client";

import React, { useEffect, useRef, useCallback, useState, createContext, useContext, ReactNode } from "react";
import { 
  useStorage, 
  useMutation, 
  useOthers, 
  useMyPresence,
  useSelf,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
  useHistory,
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
  autoSave?: boolean;
}

export type CollaborationContextProps = {
  isCollaborative: boolean;
  fields: BuilderField[];
  form: BuilderForm;
  sections: BuilderSection[];
  others: readonly any[];
  self: any;
  myPresence: any;
  updateMyPresence: (presence: any) => void;
  addField: (field: BuilderField, index?: number) => void;
  removeField: (id: string) => void;
  updateField: (id: string, changes: Partial<BuilderField>) => void;
  reorderFields: (from: number, to: number) => void;
  updateFormMeta: (changes: Partial<BuilderForm>) => void;
  addSection: (section: BuilderSection) => void;
  removeSection: (id: string) => void;
  updateSection: (id: string, changes: Partial<BuilderSection>) => void;
  reorderSection: (id: string, toIndex: number) => void;
  duplicateSection: (id: string, newSectionId: string) => void;
  selectField: (id: string | null) => void;
  selectedFieldId: string | null;
  isDragging: boolean;
  currentSectionId: string | null;
  setCurrentSectionId: (id: string | null) => void;
  selectedSectionId: string | null;
  selectSection: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  manualSave: () => Promise<{ success: boolean; error?: string }>;
  autoSave: boolean;
};

const FormCollaborationContext = createContext<CollaborationContextProps | null>(null);

export function useFormCollaborationContext() {
  const context = useContext(FormCollaborationContext);
  if (!context) {
    throw new Error("useFormCollaborationContext must be used within FormCollaborationProvider");
  }
  return context;
}

// ─── Liveblocks Collaboration Hook ──────────────────────────────────────────
function useLiveblocksCollaboration({
  formId,
  initialForm,
  initialFields,
  initialSections,
  autoSave = true,
}: UseFormCollaborationOptions): CollaborationContextProps {
  const liveAutoSave = useStorage((root) => (root.formMetadata as any)?.autoSave) ?? autoSave;
  const { 
    selectedFieldId, 
    selectField,
    isDragging,
    currentSectionId,
    setCurrentSectionId,
    selectedSectionId,
    selectSection,
  } = useFormBuilder();

  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const self = useSelf();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const history = useHistory();

  useEffect(() => {
    updateMyPresence({ 
      selectedFieldId,
      selectedSectionId,
      draggingFieldId: isDragging ? selectedFieldId : null
    });
  }, [selectedFieldId, selectedSectionId, isDragging, updateMyPresence]);

  const fields = useStorage((root) => root.fields) as unknown as BuilderField[] | null;
  const form = useStorage((root) => root.formMetadata) as unknown as BuilderForm | null;
  const sections = useStorage((root) => root.sections) as unknown as BuilderSection[] | null;

  const addField = useMutation(({ storage }, field: BuilderField, index?: number) => {
    const list = storage.get("fields");
    if (typeof index === "number") {
      list.insert(new LiveObject<BuilderField>(field), index);
      for (let i = 0; i < list.length; i++) {
        const f = list.get(i) as LiveObject<BuilderField>;
        if (f.get("orderIndex") !== i) f.set("orderIndex", i);
      }
    } else {
      list.push(new LiveObject<BuilderField>(field));
    }
  }, []);

  const removeField = useMutation(({ storage }, id: string) => {
    const list = storage.get("fields");
    const index = list.findIndex((f) => (f as LiveObject<BuilderField>).get("id") === id);
    if (index !== -1) {
      list.delete(index);
      for (let i = 0; i < list.length; i++) {
        const f = list.get(i) as LiveObject<BuilderField>;
        if (f.get("orderIndex") !== i) f.set("orderIndex", i);
      }
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
    for (let i = 0; i < list.length; i++) {
      const f = list.get(i) as LiveObject<BuilderField>;
      if (f.get("orderIndex") !== i) f.set("orderIndex", i);
    }
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

  const reconcileStorage = useMutation(({ storage }, seedSections: BuilderSection[]) => {
    history.disable(() => {
      const sectionsList = storage.get("sections");
      const fieldsList = storage.get("fields");
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (let i = 0; i < sectionsList.length; i++) {
        const s = sectionsList.get(i) as LiveObject<BuilderSection>;
        const sid = s.get("id");
        if (!uuidRe.test(sid)) {
          s.set("id", crypto.randomUUID());
        }
      }

      if (sectionsList.length === 0) {
        const toSeed: BuilderSection[] = seedSections.length > 0
          ? seedSections.map((s) => ({ ...s, id: uuidRe.test(s.id) ? s.id : crypto.randomUUID() }))
          : [{ id: crypto.randomUUID(), name: "Section 1", description: "", orderIndex: 0, type: "next" as const }];
        for (const s of toSeed) {
          sectionsList.push(new LiveObject<BuilderSection>(s));
        }
      }

      const validIds = new Set<string>();
      for (let i = 0; i < sectionsList.length; i++) {
        validIds.add((sectionsList.get(i) as LiveObject<BuilderSection>).get("id"));
      }

      if (validIds.size === 0) return;
      const firstSectionId = (sectionsList.get(0) as LiveObject<BuilderSection>).get("id");

      for (let i = 0; i < fieldsList.length; i++) {
        const f = fieldsList.get(i) as LiveObject<BuilderField>;
        const sid = f.get("sectionId");
        if (!sid || !uuidRe.test(sid) || !validIds.has(sid)) {
          f.set("sectionId", firstSectionId);
        }
      }
    });
  }, [history]);

  const reorderSection = useMutation(({ storage }, id: string, toIndex: number) => {
    const list = storage.get("sections");
    const items: { obj: LiveObject<BuilderSection>; orderIndex: number }[] = [];
    for (let i = 0; i < list.length; i++) {
      const obj = list.get(i) as LiveObject<BuilderSection>;
      items.push({ obj, orderIndex: obj.get("orderIndex") });
    }
    items.sort((a, b) => a.orderIndex - b.orderIndex);

    const fromIndex = items.findIndex((item) => item.obj.get("id") === id);
    if (fromIndex === -1 || fromIndex === toIndex) return;
    const clampedTo = Math.max(0, Math.min(toIndex, items.length - 1));

    const [moved] = items.splice(fromIndex, 1);
    items.splice(clampedTo, 0, moved);

    items.forEach((item, idx) => {
      item.obj.set("orderIndex", idx);
    });
  }, []);

  const duplicateSection = useMutation(({ storage }, id: string, newSectionId: string) => {
    const fieldsList = storage.get("fields");
    const sectionsList = storage.get("sections");
    const srcSection = sectionsList.find((s) => (s as LiveObject<BuilderSection>).get("id") === id) as LiveObject<BuilderSection> | undefined;
    if (!srcSection) return;

    const srcType = srcSection.get("type") as BuilderSection["type"];
    const newSection: BuilderSection = {
      id: newSectionId,
      name: `${srcSection.get("name")} (Copy)`,
      description: srcSection.get("description") ?? "",
      orderIndex: sectionsList.length,
      type: srcType === "success" ? "success" : (srcType ?? "next"),
    };
    sectionsList.push(new LiveObject<BuilderSection>(newSection));

    const srcFieldKeys: string[] = ["type","label","description","placeholder","required","orderIndex","options","validation","properties","isDirty","isNew"];
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

  const updateFormMetaWithoutHistory = useMutation(({ storage }, changes: Partial<BuilderForm>) => {
    history.disable(() => {
      const meta = storage.get("formMetadata");
      if (meta) {
        for (const [key, value] of Object.entries(changes)) {
          meta.set(key as keyof BuilderForm, value);
        }
      }
    });
  }, [history]);

  const lastSavedRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isSavingRef = useRef(false);
  const isDirtyRef = useRef(false);
  const mountedRef = useRef(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const persistToSupabase = useCallback(async (currentFields: BuilderField[], currentForm: BuilderForm, currentSections: BuilderSection[], showSavingState = false) => {
    const payload = JSON.stringify({ currentFields, currentForm, currentSections });
    const isEditingThisForm = typeof window !== "undefined" && 
      window.location.pathname === `/forms/${formId}/edit`;

    if (payload === lastSavedRef.current || !mountedRef.current || !isEditingThisForm) return;

    if (isSavingRef.current) {
      isDirtyRef.current = true;
      return;
    }

    try {
      isSavingRef.current = true;
      if (showSavingState) setIsSaving(true);
      isDirtyRef.current = false;

      const result = await syncFormState(formId, currentFields, currentForm, false, currentSections);

      if (!result.success) throw new Error(result.error);

      lastSavedRef.current = payload;
    } catch (err) {
      console.error("Auto-save to Supabase failed:", err);
      throw err;
    } finally {
      isSavingRef.current = false;
      if (showSavingState) setIsSaving(false);
      
      if (isDirtyRef.current && mountedRef.current && fields && form) {
        persistToSupabase(fields, form, sections ?? []);
      }
    }
  }, [formId, fields, form, sections]);

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
  }, [fieldsReady, sectionsReady, reconcileStorage, initialSections]);

  useEffect(() => {
    if (!fields || !form) return;
    if (!reconcileDoneRef.current) return;
    if (!liveAutoSave) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistToSupabase(fields, form, sections ?? []);
    }, 3000);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [fields, form, sections, persistToSupabase, liveAutoSave]);

  useEffect(() => {
    if (!form || !initialForm) return;

    const fieldsToSync: (keyof BuilderForm)[] = [
      "status", "accentColor", "acceptResponses", "requireAuth",
      "showProgress", "oneResponsePerUser", "successMessage",
      "title", "description", "slug",
      "submissionLimit", "submissionLimitEnabled",
      "submissionLimitRemaining", "submissionLimitDecremental",
      "startsAt", "startsAtEnabled",
      "endsAt", "endsAtEnabled",
      "showStartsAt", "showEndsAt",
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
      updateFormMetaWithoutHistory(changes);
    }
  }, [!!form, initialForm, updateFormMetaWithoutHistory]);

  const manualSave = useCallback(async () => {
    if (!fields || !form) return { success: false, error: "No data to save" };
    try {
      await persistToSupabase(fields, form, sections ?? [], true);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }, [fields, form, sections, persistToSupabase]);

  return {
    isCollaborative: true,
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
    undo,
    redo,
    canUndo,
    canRedo,
    isSaving,
    manualSave,
    autoSave: liveAutoSave,
  };
}

// ─── Local/Single-User Collaboration Hook ──────────────────────────────────
interface Snapshot {
  fields: BuilderField[];
  form: BuilderForm;
  sections: BuilderSection[];
}

function useLocalCollaboration({
  formId,
  initialForm,
  initialFields,
  initialSections,
  autoSave = true,
}: UseFormCollaborationOptions): CollaborationContextProps {
  const { 
    selectedFieldId, 
    selectField,
    isDragging,
    currentSectionId,
    setCurrentSectionId,
    selectedSectionId,
    selectSection,
  } = useFormBuilder();

  // Initialize state with default section if empty
  const [state, setState] = useState<Snapshot>(() => {
    const rawSections: BuilderSection[] = initialSections && initialSections.length > 0
      ? initialSections
      : [{ id: crypto.randomUUID(), name: "Section 1", description: "", orderIndex: 0, type: "next" as const }];
    
    // Ensure all fields have a sectionId assigned
    const validIds = new Set(rawSections.map(s => s.id));
    const firstSectionId = rawSections[0].id;
    const patchedFields = initialFields.map(f => {
      if (!f.sectionId || !validIds.has(f.sectionId)) {
        return { ...f, sectionId: firstSectionId };
      }
      return f;
    });

    return {
      fields: patchedFields,
      form: initialForm,
      sections: rawSections
    };
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  // ─── Presence State ───────────────────────────────────────────────────────
  const [myPresence, setMyPresence] = useState<any>({
    cursor: null,
    selectedFieldId: null,
    selectedSectionId: null,
    draggingFieldId: null,
  });

  const updateMyPresence = useCallback((presence: any) => {
    setMyPresence((prev: any) => ({ ...prev, ...presence }));
  }, []);

  const others: any[] = [];
  
  const self = {
    connectionId: 0,
    info: {
      name: "You",
      avatar: "",
      color: "#6366f1",
    },
    presence: myPresence,
  };

  useEffect(() => {
    updateMyPresence({ 
      selectedFieldId,
      selectedSectionId,
      draggingFieldId: isDragging ? selectedFieldId : null
    });
  }, [selectedFieldId, selectedSectionId, isDragging, updateMyPresence]);

  // ─── Mutations / Local State Actions ──────────────────────────────────────
  const addField = useCallback((field: BuilderField, index?: number) => {
    const current = stateRef.current;
    let nextFields = [...current.fields];
    if (typeof index === "number") {
      nextFields.splice(index, 0, field);
    } else {
      nextFields.push(field);
    }
    nextFields = nextFields.map((f, i) => ({ ...f, orderIndex: i }));
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, fields: nextFields });
  }, []);

  const removeField = useCallback((id: string) => {
    const current = stateRef.current;
    let nextFields = current.fields.filter(f => f.id !== id);
    nextFields = nextFields.map((f, i) => ({ ...f, orderIndex: i }));
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, fields: nextFields });
  }, []);

  const updateField = useCallback((id: string, changes: Partial<BuilderField>) => {
    const current = stateRef.current;
    const nextFields = current.fields.map(f => f.id === id ? { ...f, ...changes } : f);
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, fields: nextFields });
  }, []);

  const reorderFields = useCallback((from: number, to: number) => {
    const current = stateRef.current;
    const nextFields = [...current.fields];
    const [moved] = nextFields.splice(from, 1);
    nextFields.splice(to, 0, moved);
    const updatedFields = nextFields.map((f, i) => ({ ...f, orderIndex: i }));
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, fields: updatedFields });
  }, []);

  const addSection = useCallback((section: BuilderSection) => {
    const current = stateRef.current;
    const nextSections = [...current.sections, section];
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, sections: nextSections });
  }, []);

  const removeSection = useCallback((id: string) => {
    const current = stateRef.current;
    const nextSections = current.sections.filter(s => s.id !== id);
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, sections: nextSections });
  }, []);

  const updateSection = useCallback((id: string, changes: Partial<BuilderSection>) => {
    const current = stateRef.current;
    const nextSections = current.sections.map(s => s.id === id ? { ...s, ...changes } : s);
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, sections: nextSections });
  }, []);

  const reorderSection = useCallback((id: string, toIndex: number) => {
    const current = stateRef.current;
    const sorted = [...current.sections].sort((a, b) => a.orderIndex - b.orderIndex);
    const fromIndex = sorted.findIndex(s => s.id === id);
    if (fromIndex === -1) return;
    const clampedTo = Math.max(0, Math.min(toIndex, sorted.length - 1));
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(clampedTo, 0, moved);
    const nextSections = sorted.map((s, idx) => ({ ...s, orderIndex: idx }));
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, sections: nextSections });
  }, []);

  const duplicateSection = useCallback((id: string, newSectionId: string) => {
    const current = stateRef.current;
    const srcSection = current.sections.find(s => s.id === id);
    if (!srcSection) return;
    
    const srcType = srcSection.type;
    const newSection: BuilderSection = {
      id: newSectionId,
      name: `${srcSection.name} (Copy)`,
      description: srcSection.description ?? "",
      orderIndex: current.sections.length,
      type: srcType === "success" ? "success" : (srcType ?? "next"),
    };
    
    const srcFields = current.fields.filter(f => f.sectionId === id);
    const duplicatedFields = srcFields.map(f => ({
      ...f,
      id: crypto.randomUUID(),
      sectionId: newSectionId,
      isNew: true,
    }));
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({
      ...current,
      sections: [...current.sections, newSection],
      fields: [...current.fields, ...duplicatedFields]
    });
  }, []);

  const updateFormMeta = useCallback((changes: Partial<BuilderForm>) => {
    const current = stateRef.current;
    const nextForm = { ...current.form, ...changes };
    
    setPast(p => [...p, current]);
    setFuture([]);
    setState({ ...current, form: nextForm });
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const current = stateRef.current;
    const previous = past[past.length - 1];
    setPast(p => p.slice(0, p.length - 1));
    setFuture(f => [current, ...f]);
    setState(previous);
  }, [past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const current = stateRef.current;
    const next = future[0];
    setFuture(f => f.slice(1));
    setPast(p => [...p, current]);
    setState(next);
  }, [future]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // ─── Autosave / Manual Save ──────────────────────────────────────────────
  const lastSavedRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isSavingRef = useRef(false);
  const isDirtyRef = useRef(false);
  const mountedRef = useRef(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const persistToSupabase = useCallback(async (
    currentFields: BuilderField[],
    currentForm: BuilderForm,
    currentSections: BuilderSection[],
    showSavingState = false
  ) => {
    const payload = JSON.stringify({ currentFields, currentForm, currentSections });
    const isEditingThisForm = typeof window !== "undefined" && 
      window.location.pathname === `/forms/${formId}/edit`;

    if (payload === lastSavedRef.current || !mountedRef.current || !isEditingThisForm) return;

    if (isSavingRef.current) {
      isDirtyRef.current = true;
      return;
    }

    try {
      isSavingRef.current = true;
      if (showSavingState) setIsSaving(true);
      isDirtyRef.current = false;

      const result = await syncFormState(formId, currentFields, currentForm, false, currentSections);

      if (!result.success) throw new Error(result.error);

      lastSavedRef.current = payload;
    } catch (err) {
      console.error("Auto-save to Supabase failed:", err);
      throw err;
    } finally {
      isSavingRef.current = false;
      if (showSavingState) setIsSaving(false);
      
      if (isDirtyRef.current && mountedRef.current) {
        const latest = stateRef.current;
        persistToSupabase(latest.fields, latest.form, latest.sections);
      }
    }
  }, [formId]);

  useEffect(() => {
    if (!autoSave) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistToSupabase(state.fields, state.form, state.sections);
    }, 3000);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [state.fields, state.form, state.sections, persistToSupabase, autoSave]);

  const manualSave = useCallback(async () => {
    try {
      await persistToSupabase(state.fields, state.form, state.sections, true);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }, [state.fields, state.form, state.sections, persistToSupabase]);

  return {
    isCollaborative: false,
    fields: state.fields,
    form: state.form,
    sections: state.sections,
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
    undo,
    redo,
    canUndo,
    canRedo,
    isSaving,
    manualSave,
    autoSave,
  };
}

// ─── Provider Component ──────────────────────────────────────────────────────
interface FormCollaborationProviderProps {
  children: ReactNode;
  roomId: string;
  initialForm: BuilderForm;
  initialFields: BuilderField[];
  initialSections?: BuilderSection[];
  enabled: boolean;
}

export function FormCollaborationProvider({
  children,
  roomId,
  initialForm,
  initialFields,
  initialSections,
  enabled,
}: FormCollaborationProviderProps) {
  if (enabled) {
    return React.createElement(
      LiveblocksCollaborationWrapper,
      { roomId, initialForm, initialFields, initialSections, children }
    );
  }

  return React.createElement(
    LocalCollaborationWrapper,
    { roomId, initialForm, initialFields, initialSections, children }
  );
}

function LiveblocksCollaborationWrapper({
  children,
  roomId,
  initialForm,
  initialFields,
  initialSections,
}: Omit<FormCollaborationProviderProps, "enabled">) {
  const value = useLiveblocksCollaboration({
    formId: roomId,
    initialForm,
    initialFields,
    initialSections,
    autoSave: initialForm.autoSave,
  });

  return React.createElement(
    FormCollaborationContext.Provider,
    { value },
    children
  );
}

function LocalCollaborationWrapper({
  children,
  roomId,
  initialForm,
  initialFields,
  initialSections,
}: Omit<FormCollaborationProviderProps, "enabled">) {
  const value = useLocalCollaboration({
    formId: roomId,
    initialForm,
    initialFields,
    initialSections,
    autoSave: initialForm.autoSave,
  });

  return React.createElement(
    FormCollaborationContext.Provider,
    { value },
    children
  );
}
