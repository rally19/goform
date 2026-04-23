import { RichText } from "@/components/ui/rich-text";
import { useFormBuilder } from "@/hooks/use-form-builder";

interface FormHeaderEditorProps {
  accentColor?: string;
  title?: string;
  description?: string;
  onUpdate?: (changes: { title?: string; description?: string }) => void;
  workspaceId?: string;
}

export function FormHeaderEditor({ 
  accentColor = "#6366f1",
  title = "Untitled Form",
  description = "",
  onUpdate,
  workspaceId
}: FormHeaderEditorProps) {
  const { selectField } = useFormBuilder();

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm cursor-pointer"
      onClick={() => selectField(null)}
    >
      {/* Color accent bar */}
      <div className="h-2" style={{ backgroundColor: accentColor }} />

      <div className="p-4 md:p-8 space-y-4">
        <RichText
          value={title}
          onChange={(val) => onUpdate?.({ title: val })}
          placeholder="Untitled Form"
          workspaceId={workspaceId}
          className="w-full text-foreground"
          minHeight="min-h-[40px]"
          multiline={false}
          allowImages={false}
          onFocus={() => selectField(null)}
        />
        <RichText
          value={description}
          onChange={(val) => onUpdate?.({ description: val })}
          placeholder="Form description (optional)"
          workspaceId={workspaceId}
          className="w-full text-foreground/80"
          minHeight="min-h-[60px]"
          onFocus={() => selectField(null)}
        />
      </div>
    </div>
  );
}
