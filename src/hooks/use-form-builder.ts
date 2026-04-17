"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

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
  
  // ─── Actions ────────────────────────────────────────────────────────────────
  // Select a field for editing
  selectField: (id: string | null) => void;
  // Set drag state
  setIsDragging: (val: boolean) => void;
  // Set current section (pagination)
  setCurrentSectionId: (id: string | null) => void;
  // Select a section (for properties panel)
  selectSection: (id: string | null) => void;
  // Clear all UI state
  reset: () => void;
}

export const useFormBuilder = create<FormBuilderState>()(
  immer((set) => ({
    selectedFieldId: null,
    isDragging: false,
    currentSectionId: null,
    selectedSectionId: null,

    selectField: (id) => {
      set((state) => {
        state.selectedFieldId = id;
        if (id !== null) state.selectedSectionId = null;
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
      });
    },

    reset: () => {
      set((state) => {
        state.selectedFieldId = null;
        state.isDragging = false;
        state.currentSectionId = null;
        state.selectedSectionId = null;
      });
    },
  }))
);
