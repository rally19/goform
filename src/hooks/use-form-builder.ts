"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { BuilderField, BuilderForm, FieldType } from "@/lib/form-types";
import { FIELD_TYPE_META } from "@/lib/form-types";

// ─── Helper: nanoid without external dep ─────────────────────────────────────
function uid() {
  return typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// ─── Collaborator presence info ────────────────────────────────────────────────
export interface CollaboratorInfo {
  userId: string;
  name: string;
  email: string;
  color: string;
  selectedFieldId: string | null;
  /** presenceRef key from Supabase (used to remove on leave) */
  presenceKey: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface FormBuilderState {
  // Form metadata
  form: BuilderForm | null;
  // Fields on the canvas
  fields: BuilderField[];
  // Which field is selected (for settings panel)
  selectedFieldId: string | null;
  // Dirty flag - unsaved changes
  isDirty: boolean;
  // Saving state
  isSaving: boolean;
  // Collaboration toggle guard
  isCollabToggling: boolean;
  // Drag and drop state
  isDragging: boolean;
  // Origin filtering - was the last change made locally?
  lastChangeLocal: boolean;

  // ─── Collaboration ──────────────────────────────────────────────────────────
  /** Other connected collaborators (not current user) */
  collaborators: CollaboratorInfo[];
  /** Map of fieldId → CollaboratorInfo of who is currently selecting that field */
  fieldLocks: Record<string, CollaboratorInfo>;
  /** Map of fieldId → Instant broadcast lock (bypasses presence lag) */
  broadcastLocks: Record<string, { userId: string; name: string; color: string }>;

  // ─── Actions ────────────────────────────────────────────────────────────────
  // Init from DB data
  initialize: (form: BuilderForm, fields: BuilderField[]) => void;
  // Add a field from component panel
  addField: (type: FieldType, index?: number) => void;
  // Remove a field
  removeField: (id: string) => void;
  // Duplicate a field
  duplicateField: (id: string) => void;
  // Reorder fields (from DnD)
  reorderFields: (fromIndex: number, toIndex: number) => void;
  // Select a field for editing
  selectField: (id: string | null) => void;
  // Update selected field's property
  updateField: (id: string, changes: Partial<BuilderField>) => void;
  // Update form metadata
  updateFormMeta: (changes: Partial<BuilderForm>) => void;
  // Mark as saved
  markSaved: () => void;
  // Set saving
  setSaving: (val: boolean) => void;
  // Add option to a choice field
  addOption: (fieldId: string) => void;
  // Remove option from a choice field
  removeOption: (fieldId: string, optionIndex: number) => void;
  // Update option label/value
  updateOption: (fieldId: string, optionIndex: number, label: string) => void;
  // Reorder options
  reorderOptions: (fieldId: string, fromIndex: number, toIndex: number) => void;
  // Set collab toggling guard
  setIsCollabToggling: (val: boolean) => void;
  // Set drag state
  setIsDragging: (val: boolean) => void;

  // ─── Collaboration actions ──────────────────────────────────────────────────
  /**
   * Apply a remote broadcast update. Does NOT set isDirty to avoid re-broadcasting loops.
   */
  applyRemoteUpdate: (payload: { fields?: BuilderField[]; form?: Partial<BuilderForm> }) => void;
  /** Replace the full collaborators list from a Presence sync event */
  setCollaborators: (collaborators: CollaboratorInfo[]) => void;
  /** Recompute fieldLocks from current collaborators list */
  recomputeLocks: () => void;
  /** Update a specific collaborator's selection (fast-path from broadcast) */
  updateCollaboratorSelection: (userId: string, name: string, color: string, fieldId: string | null) => void;
  /** Update local field lock state from DB change (non-dirtying) */
  setFieldLock: (id: string, lockedBy: string | null) => void;
  /** Update form metadata from DB change (non-dirtying) */
  setFormMeta: (changes: Partial<BuilderForm>) => void;
}

export const useFormBuilder = create<FormBuilderState>()(
  immer((set, get) => ({
    form: null,
    fields: [],
    selectedFieldId: null,
    isDirty: false,
    isSaving: false,
    collaborators: [],
    fieldLocks: {},
    broadcastLocks: {},
    isCollabToggling: false,
    isDragging: false,
    lastChangeLocal: false,

    initialize: (form, fields) => {
      set((state) => {
        state.form = form;
        state.fields = fields;
        state.isDirty = false;
        state.selectedFieldId = null;
        state.collaborators = [];
        state.fieldLocks = {};
        state.lastChangeLocal = false;
      });
    },

    addField: (type, index) => {
      const meta = FIELD_TYPE_META.find((m) => m.type === type);
      if (!meta) return;

      const newField: BuilderField = {
        id: uid(),
        type,
        label: meta.defaultLabel,
        description: "",
        placeholder: "",
        required: false,
        orderIndex: get().fields.length,
        options: meta.defaultOptions ? [...meta.defaultOptions] : undefined,
        properties: meta.defaultProperties ? { ...meta.defaultProperties } : undefined,
        isNew: true,
      };

      set((state) => {
        if (typeof index === "number") {
          state.fields.splice(index, 0, newField);
        } else {
          state.fields.push(newField);
        }
        state.selectedFieldId = newField.id;
        state.isDirty = true;
        state.lastChangeLocal = true;
      });
    },

    removeField: (id) => {
      set((state) => {
        state.fields = state.fields.filter((f) => f.id !== id);
        if (state.selectedFieldId === id) state.selectedFieldId = null;
        state.isDirty = true;
        state.lastChangeLocal = true;
      });
    },

    duplicateField: (id) => {
      const original = get().fields.find((f) => f.id === id);
      if (!original) return;

      const copy: BuilderField = {
        ...original,
        id: uid(),
        label: `${original.label} (Copy)`,
        isNew: true,
        options: original.options ? [...original.options] : undefined,
        properties: original.properties ? { ...original.properties } : undefined,
      };

      set((state) => {
        const idx = state.fields.findIndex((f) => f.id === id);
        state.fields.splice(idx + 1, 0, copy);
        state.selectedFieldId = copy.id;
        state.isDirty = true;
        state.lastChangeLocal = true;
      });
    },

    reorderFields: (fromIndex, toIndex) => {
      set((state) => {
        const [moved] = state.fields.splice(fromIndex, 1);
        state.fields.splice(toIndex, 0, moved);
        state.isDirty = true;
        state.lastChangeLocal = true;
      });
    },

    selectField: (id) => {
      set((state) => {
        state.selectedFieldId = id;
      });
    },

    updateField: (id, changes) => {
      set((state) => {
        const field = state.fields.find((f) => f.id === id);
        if (field) {
          Object.assign(field, changes, { isDirty: true });
          state.isDirty = true;
          state.lastChangeLocal = true;
        }
      });
    },

    updateFormMeta: (changes) => {
      set((state) => {
        if (state.form) {
          Object.assign(state.form, changes);
          state.isDirty = true;
          state.lastChangeLocal = true;
        }
      });
    },

    markSaved: () => {
      set((state) => {
        state.isDirty = false;
        state.isSaving = false;
        state.fields.forEach((f) => {
          f.isDirty = false;
          f.isNew = false;
        });
        state.lastChangeLocal = false;
      });
    },

    setSaving: (val) => {
      set((state) => {
        state.isSaving = val;
      });
    },

    addOption: (fieldId) => {
      set((state) => {
        const field = state.fields.find((f) => f.id === fieldId);
        if (field) {
          if (!field.options) field.options = [];
          const idx = field.options.length + 1;
          field.options.push({ label: `Option ${idx}`, value: `option_${idx}` });
          state.isDirty = true;
          state.lastChangeLocal = true;
        }
      });
    },

    removeOption: (fieldId, optionIndex) => {
      set((state) => {
        const field = state.fields.find((f) => f.id === fieldId);
        if (field?.options) {
          field.options.splice(optionIndex, 1);
          state.isDirty = true;
          state.lastChangeLocal = true;
        }
      });
    },

    updateOption: (fieldId, optionIndex, label) => {
      set((state) => {
        const field = state.fields.find((f) => f.id === fieldId);
        if (field?.options?.[optionIndex]) {
          field.options[optionIndex].label = label;
          field.options[optionIndex].value = label
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "");
          state.isDirty = true;
          state.lastChangeLocal = true;
        }
      });
    },

    reorderOptions: (fieldId, fromIndex, toIndex) => {
      set((state) => {
        const field = state.fields.find((f) => f.id === fieldId);
        if (field?.options) {
          const [moved] = field.options.splice(fromIndex, 1);
          field.options.splice(toIndex, 0, moved);
          state.isDirty = true;
          state.lastChangeLocal = true;
        }
      });
    },

    setIsCollabToggling: (val) => {
      set((state) => {
        state.isCollabToggling = val;
      });
    },

    setIsDragging: (val) => {
      set((state) => {
        state.isDragging = val;
      });
    },

    // ─── Collaboration ────────────────────────────────────────────────────────

    applyRemoteUpdate: ({ fields, form: formChanges }) => {
      set((state) => {
        if (fields !== undefined) {
          // Preserve isNew/isDirty flags for local-only fields that haven't been broadcast yet
          state.fields = fields;
        }
        if (formChanges !== undefined && state.form) {
          // Never overwrite collaborationEnabled from a broadcast snapshot. Server DB is authority.
          const safeChanges = { ...formChanges };
          delete safeChanges.collaborationEnabled;
          Object.assign(state.form, safeChanges);
        }
        state.lastChangeLocal = false;
        // Deliberately NOT setting isDirty — this is a remote update
      });
    },

    setCollaborators: (collaborators) => {
      set((state) => {
        state.collaborators = collaborators;
        
        // Recompute official locks from presence
        const locks: Record<string, CollaboratorInfo> = {};
        for (const c of collaborators) {
          if (c.selectedFieldId) {
            locks[c.selectedFieldId] = c;
          }
        }
        state.fieldLocks = locks;

        // Cleanup broadcastLocks for anyone who is NO LONGER in the presence list
        const activeIds = new Set(collaborators.map(c => c.userId));
        for (const fieldId in state.broadcastLocks) {
          if (!activeIds.has(state.broadcastLocks[fieldId].userId)) {
             delete state.broadcastLocks[fieldId];
          }
        }
      });
    },

    recomputeLocks: () => {
      set((state) => {
        const locks: Record<string, CollaboratorInfo> = {};
        for (const c of state.collaborators) {
          if (c.selectedFieldId) {
            locks[c.selectedFieldId] = c;
          }
        }
        state.fieldLocks = locks;
      });
    },

    updateCollaboratorSelection: (userId, name, color, fieldId) => {
      set((state) => {
        // ALWAYS update the broadcast lock map immediately
        // Remove user's previous lock first
        for (const fId in state.broadcastLocks) {
          if (state.broadcastLocks[fId].userId === userId) {
            delete state.broadcastLocks[fId];
          }
        }
        // Add new lock if it's not null
        if (fieldId) {
          state.broadcastLocks[fieldId] = { userId, name, color };
        }

        // Also update the presence collaborator if they exist
        const collab = state.collaborators.find((c) => c.userId === userId);
        if (collab) {
          collab.selectedFieldId = fieldId;
          
          // Fast-recompute locks from presence list
          const locks: Record<string, CollaboratorInfo> = {};
          for (const c of state.collaborators) {
            if (c.selectedFieldId) {
              locks[c.selectedFieldId] = c;
            }
          }
          state.fieldLocks = locks;
        }
      });
    },

    setFieldLock: (id, lockedBy) => {
      set((state) => {
        const field = state.fields.find((f) => f.id === id);
        if (field) {
          field.lockedBy = lockedBy;
        }
      });
    },

    setFormMeta: (changes) => {
      set((state) => {
        if (state.form) {
          Object.assign(state.form, changes);
          // Deliberately NOT setting isDirty
        }
      });
    },
  }))
);
