"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

enableMapSet();

// ─── State ────────────────────────────────────────────────────────────────────

interface FormBuilderState {
  // Which field is selected (for settings panel)
  selectedFieldId: string | null;
  // Drag and drop state
  isDragging: boolean;
  // Currently viewed section id
  currentSectionId: string | null;
  // Selected section id (for properties panel)
  selectedSectionId: string | null;
  // Multi-select field ids
  multiSelectedFieldIds: Set<string>;
  
  // ─── Actions ────────────────────────────────────────────────────────────────
  // Select a field for editing
  selectField: (id: string | null) => void;
  // Set drag state
  setIsDragging: (val: boolean) => void;
  // Set current section (pagination)
  setCurrentSectionId: (id: string | null) => void;
  // Select a section (for properties panel)
  selectSection: (id: string | null) => void;
  // Toggle a field in multi-select
  toggleMultiSelect: (id: string) => void;
  // Clear multi-select
  clearMultiSelect: () => void;
  // Set multi-select to specific ids
  setMultiSelect: (ids: string[]) => void;
  // Clear all UI state
  reset: () => void;
}

export const useFormBuilder = create<FormBuilderState>()(
  immer((set) => ({
    selectedFieldId: null,
    isDragging: false,
    currentSectionId: null,
    selectedSectionId: null,
    multiSelectedFieldIds: new Set<string>(),

    selectField: (id) => {
      set((state) => {
        state.selectedFieldId = id;
        if (id !== null) {
          state.selectedSectionId = null;
          state.multiSelectedFieldIds = new Set();
        }
      });
    },

    setIsDragging: (val) => {
      set((state) => {
        state.isDragging = val;
      });
    },

    setCurrentSectionId: (id) => {
      set((state) => {
        state.currentSectionId = id;
      });
    },

    selectSection: (id) => {
      set((state) => {
        state.selectedSectionId = id;
        state.selectedFieldId = null;
        state.multiSelectedFieldIds = new Set();
      });
    },

    toggleMultiSelect: (id) => {
      set((state) => {
        const next = new Set(state.multiSelectedFieldIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        state.multiSelectedFieldIds = next;
        // Clear single-select when multi-selecting
        if (next.size > 0) {
          state.selectedFieldId = null;
          state.selectedSectionId = null;
        }
      });
    },

    clearMultiSelect: () => {
      set((state) => {
        state.multiSelectedFieldIds = new Set();
      });
    },

    setMultiSelect: (ids) => {
      set((state) => {
        state.multiSelectedFieldIds = new Set(ids);
        if (ids.length > 0) {
          state.selectedFieldId = null;
          state.selectedSectionId = null;
        }
      });
    },

    reset: () => {
      set((state) => {
        state.selectedFieldId = null;
        state.isDragging = false;
        state.currentSectionId = null;
        state.selectedSectionId = null;
        state.multiSelectedFieldIds = new Set();
      });
    },
  }))
);
