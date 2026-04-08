"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { BuilderField, BuilderForm, FieldType } from "@/lib/form-types";
import { FIELD_TYPE_META } from "@/lib/form-types";

// ─── Helper: nanoid without external dep ─────────────────────────────────────
// Use crypto.randomUUID which is available in modern browsers/Node
function uid() {
  return typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
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
}

export const useFormBuilder = create<FormBuilderState>()(
  immer((set, get) => ({
    form: null,
    fields: [],
    selectedFieldId: null,
    isDirty: false,
    isSaving: false,

    initialize: (form, fields) => {
      set((state) => {
        state.form = form;
        state.fields = fields;
        state.isDirty = false;
        state.selectedFieldId = null;
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
      });
    },

    removeField: (id) => {
      set((state) => {
        state.fields = state.fields.filter((f) => f.id !== id);
        if (state.selectedFieldId === id) state.selectedFieldId = null;
        state.isDirty = true;
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
      });
    },

    reorderFields: (fromIndex, toIndex) => {
      set((state) => {
        const [moved] = state.fields.splice(fromIndex, 1);
        state.fields.splice(toIndex, 0, moved);
        state.isDirty = true;
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
        }
      });
    },

    updateFormMeta: (changes) => {
      set((state) => {
        if (state.form) {
          Object.assign(state.form, changes);
          state.isDirty = true;
        }
      });
    },

    markSaved: () => {
      set((state) => {
        state.isDirty = false;
        state.isSaving = false;
        // Mark all fields as not new/dirty
        state.fields.forEach((f) => {
          f.isDirty = false;
          f.isNew = false;
        });
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
        }
      });
    },

    removeOption: (fieldId, optionIndex) => {
      set((state) => {
        const field = state.fields.find((f) => f.id === fieldId);
        if (field?.options) {
          field.options.splice(optionIndex, 1);
          state.isDirty = true;
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
        }
      });
    },
  }))
);
