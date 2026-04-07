"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DndContext, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragOverlay
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Settings2, Trash2, Type, CheckSquare, ListOrdered, Calendar } from "lucide-react";

type Field = {
  id: string;
  type: "text" | "checkbox" | "select" | "date";
  label: string;
  required: boolean;
};

// Sortable Item Component
function SortableField({ field, onRemove }: { field: Field, onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={`bg-card ${isDragging ? "ring-2 ring-primary border-primary" : ""}`}>
      <CardContent className="p-4 flex gap-4 items-start group">
        <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground pt-1 outline-none">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{field.label} {field.required && <span className="text-destructive">*</span>}</h4>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemove(field.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
             {field.type === "text" && <div className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground pointer-events-none">Short answer text</div>}
             {field.type === "checkbox" && <div className="flex items-center space-x-2 text-sm text-muted-foreground"><div className="h-4 w-4 rounded-sm border border-primary pointer-events-none" /><span>Option 1</span></div>}
             {field.type === "select" && <div className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground pointer-events-none">Dropdown options...</div>}
             {field.type === "date" && <div className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground pointer-events-none flex justify-between"><span>dd/mm/yyyy</span><Calendar className="h-4 w-4" /></div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FormBuilderPage() {
  const [fields, setFields] = useState<Field[]>([
    { id: "f1", type: "text", label: "Full Name", required: true },
    { id: "f2", type: "select", label: "Department", required: false },
    { id: "f3", type: "text", label: "Feedback", required: true },
  ]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const addField = (type: Field["type"], label: string) => {
    setFields([...fields, { id: `new_${Date.now()}`, type, label, required: false }]);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100svh-113px)]">
      {/* Sidebar Tools */}
      <div className="w-full md:w-64 border-r border-border bg-card p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wider">Form Elements</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start h-10 px-3 cursor-pointer" onClick={() => addField("text", "Short Answer")}>
            <Type className="mr-2 h-4 w-4 text-muted-foreground" />
            Short Answer
          </Button>
          <Button variant="outline" className="w-full justify-start h-10 px-3 cursor-pointer" onClick={() => addField("text", "Long Answer")}>
             <span className="mr-2 h-4 w-4 text-muted-foreground flex items-center justify-center font-serif text-sm">¶</span>
             Paragraph
          </Button>
          <Button variant="outline" className="w-full justify-start h-10 px-3 cursor-pointer" onClick={() => addField("select", "Multiple Choice")}>
            <ListOrdered className="mr-2 h-4 w-4 text-muted-foreground" />
            Multiple Choice
          </Button>
          <Button variant="outline" className="w-full justify-start h-10 px-3 cursor-pointer" onClick={() => addField("checkbox", "Checkboxes")}>
            <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
            Checkboxes
          </Button>
          <Button variant="outline" className="w-full justify-start h-10 px-3 cursor-pointer" onClick={() => addField("date", "Date Picker")}>
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            Date Picker
          </Button>
        </div>
      </div>

      {/* Builder Canvas */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/20">
        <div className="max-w-3xl mx-auto">
          {/* Form Header Area */}
          <Card className="mb-6 border-transparent border-t-[8px] border-t-primary shadow-sm">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold font-sans outline-none focus:bg-muted/50 p-1 -ml-1 rounded transition-colors" contentEditable suppressContentEditableWarning>Customer Feedback 2024</h1>
              <p className="text-muted-foreground mt-2 outline-none focus:bg-muted/50 p-1 -ml-1 rounded transition-colors" contentEditable suppressContentEditableWarning>Please fill out this form to help us improve our services.</p>
            </CardContent>
          </Card>

          {/* Form Fields Sortable Context */}
          <DndContext 
            sensors={sensors}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              <SortableContext 
                items={fields.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {fields.map((field) => (
                  <SortableField key={field.id} field={field} onRemove={removeField} />
                ))}
              </SortableContext>
            </div>
          </DndContext>

          <Button variant="outline" className="w-full border-dashed mt-6 py-8 text-muted-foreground">
            Drag items from the sidebar or click to add a new question
          </Button>
        </div>
      </div>
    </div>
  );
}
