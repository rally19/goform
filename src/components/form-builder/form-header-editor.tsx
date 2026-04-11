"use client";

import { useFormBuilder } from "@/hooks/use-form-builder";

interface FormHeaderEditorProps {
  accentColor?: string;
  title?: string;
  description?: string;
  onUpdate?: (changes: { title?: string; description?: string }) => void;
}

export function FormHeaderEditor({ 
  accentColor = "#6366f1",
  title = "Untitled Form",
  description = "",
  onUpdate
}: FormHeaderEditorProps) {
  const { selectField } = useFormBuilder();

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm cursor-pointer"
      onClick={() => selectField(null)}
    >
      {/* Color accent bar */}
      <div className="h-2" style={{ backgroundColor: accentColor }} />

      <div className="p-4 md:p-8 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => onUpdate?.({ title: e.target.value })}
          className="w-full text-xl sm:text-2xl md:text-3xl font-bold bg-transparent border-0 outline-none focus:bg-muted/30 transition-colors rounded px-1 -mx-1 text-foreground placeholder:text-muted-foreground/40"
          placeholder="Untitled Form"
          onClick={(e) => e.stopPropagation()}
        />
        <textarea
          value={description}
          onChange={(e) => onUpdate?.({ description: e.target.value })}
          className="w-full text-sm text-muted-foreground bg-transparent border-0 outline-none focus:bg-muted/30 transition-colors rounded px-1 -mx-1 resize-none placeholder:text-muted-foreground/30"
          placeholder="Form description (optional)"
          rows={2}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
