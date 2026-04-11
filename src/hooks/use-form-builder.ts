"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// ─── State ────────────────────────────────────────────────────────────────────

interface FormBuilderState {
  // Which field is selected (for settings panel)
  selectedFieldId: string | null;
  // Drag and drop state
  isDragging: boolean;
  
  // ─── Actions ────────────────────────────────────────────────────────────────
  // Select a field for editing
  selectField: (id: string | null) => void;
  // Set drag state
  setIsDragging: (val: boolean) => void;
  // Clear all UI state
  reset: () => void;
}

export const useFormBuilder = create<FormBuilderState>()(
  immer((set) => ({
    selectedFieldId: null,
    isDragging: false,

    selectField: (id) => {
      set((state) => {
        state.selectedFieldId = id;
      });
    },

    setIsDragging: (val) => {
      set((state) => {
        state.isDragging = val;
      });
    },

    reset: () => {
      set((state) => {
        state.selectedFieldId = null;
        state.isDragging = false;
      });
    },
  }))
);
