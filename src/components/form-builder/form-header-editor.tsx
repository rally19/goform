"use client";

import { useFormBuilder } from "@/hooks/use-form-builder";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormHeaderEditorProps {
  accentColor?: string;
}

export function FormHeaderEditor({ accentColor = "#6366f1" }: FormHeaderEditorProps) {
  const { form, updateFormMeta, selectField } = useFormBuilder();

  if (!form) return null;

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm cursor-pointer"
      onClick={() => selectField(null)}
    >
      {/* Color accent bar */}
      <div className="h-2" style={{ backgroundColor: accentColor }} />

      <div className="p-6 md:p-8 space-y-3">
        <input
          type="text"
          value={form.title}
          onChange={(e) => updateFormMeta({ title: e.target.value })}
          className="w-full text-2xl md:text-3xl font-bold bg-transparent border-0 outline-none focus:bg-muted/30 transition-colors rounded px-1 -mx-1 text-foreground placeholder:text-muted-foreground/40"
          placeholder="Untitled Form"
          onClick={(e) => e.stopPropagation()}
        />
        <textarea
          value={form.description ?? ""}
          onChange={(e) => updateFormMeta({ description: e.target.value })}
          className="w-full text-sm text-muted-foreground bg-transparent border-0 outline-none focus:bg-muted/30 transition-colors rounded px-1 -mx-1 resize-none placeholder:text-muted-foreground/30"
          placeholder="Form description (optional)"
          rows={2}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
