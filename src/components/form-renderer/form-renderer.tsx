"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { sanitize } from "@/lib/sanitize";
import type { FormField } from "@/db/schema";
import type { Form } from "@/db/schema";
import type { FormAnswer, BuilderSection, LogicRule, BuilderField } from "@/lib/form-types";
import { evaluateLogic, type FieldDynamicState } from "@/lib/form-logic";
import { submitFormResponse, getPublicFormStatus } from "@/lib/actions/responses";
import { createClient } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Star, ChevronLeft, ChevronRight, Send, CheckCircle2, Loader2, Lock, UserX, Upload, X, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";

interface FormRendererProps {
  form: Form;
  fields: FormField[];
  sections?: BuilderSection[];
  logic?: LogicRule[];
  mode?: "preview" | "public";
  isAuthenticated?: boolean;
}

const PAGE_BREAK_TYPE = "page_break";

type RendererPage = { sectionName?: string; sectionDescription?: string; fields: FormField[] };

function groupIntoPages(fields: FormField[], sections?: BuilderSection[]): RendererPage[] {
  const sortedSections = sections && sections.length > 0
    ? [...sections].sort((a, b) => a.orderIndex - b.orderIndex)
    : null;

  if (sortedSections && sortedSections.length > 0) {
    const pages: RendererPage[] = [];
    for (const section of sortedSections) {
      const sectionFields = fields
        .filter((f) => f.sectionId === section.id && f.type !== PAGE_BREAK_TYPE)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      // Split this section's fields further on page_break if any exist
      // (for backward compat where page_break was used within a section)
      let currentChunk: FormField[] = [];
      let firstChunk = true;
      for (const field of sectionFields) {
        if (field.type === PAGE_BREAK_TYPE) {
          pages.push({
            sectionName: firstChunk ? section.name : undefined,
            sectionDescription: firstChunk ? section.description : undefined,
            fields: currentChunk,
          });
          currentChunk = [];
          firstChunk = false;
        } else {
          currentChunk.push(field);
        }
      }
      pages.push({
        sectionName: firstChunk ? section.name : undefined,
        sectionDescription: firstChunk ? section.description : undefined,
        fields: currentChunk,
      });
    }
    return pages.length > 0 ? pages : [{ fields: [] }];
  }

  // Fallback: no sections — split on page_break only (legacy behaviour)
  const pages: RendererPage[] = [];
  let currentPage: FormField[] = [];
  for (const field of fields) {
    if (field.type === PAGE_BREAK_TYPE) {
      if (currentPage.length > 0) pages.push({ fields: currentPage });
      currentPage = [];
    } else {
      currentPage.push(field);
    }
  }
  if (currentPage.length > 0) pages.push({ fields: currentPage });
  return pages.length > 0 ? pages : [{ fields: [] }];
}

function StarRating({
  stars = 5,
  value,
  onChange,
  accentColor,
}: {
  stars?: number;
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {Array.from({ length: stars }).map((_, i) => {
        const num = i + 1;
        const filled = num <= (hovered || value);
        return (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            onMouseEnter={() => setHovered(num)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className="h-7 w-7"
              fill={filled ? accentColor : "transparent"}
              color={filled ? accentColor : "#94a3b8"}
            />
          </button>
        );
      })}
    </div>
  );
}

function ScaleSelector({
  min,
  max,
  value,
  onChange,
  minLabel,
  maxLabel,
  accentColor,
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
  accentColor: string;
}) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-10 w-10 rounded-lg border-2 text-sm font-medium transition-all",
              value === n
                ? "border-transparent text-white scale-110 shadow-md"
                : "border-border text-foreground hover:border-muted-foreground"
            )}
            style={value === n ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
          >
            {n}
          </button>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function FileUploadField({
  field,
  files,
  onChange,
  disabled,
  error,
}: {
  field: FormField;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const props = field.properties ?? {};
  const allowMultiple = props.allowMultiple ?? false;
  const maxFiles = props.maxFiles ?? 5;
  const maxFileSizeMB = props.maxFileSize ?? 2;
  const acceptedTypes = props.acceptedTypes as string[] | undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    let newFiles = allowMultiple ? [...files, ...selectedFiles] : [...selectedFiles];

    if (allowMultiple && newFiles.length > maxFiles) {
      toast.error(`You can only upload up to ${maxFiles} files.`);
      newFiles = newFiles.slice(0, maxFiles);
    }

    const validFiles = newFiles.filter((f) => {
      if (f.size > maxFileSizeMB * 1024 * 1024) {
        toast.error(`File ${f.name} exceeds ${maxFileSizeMB}MB limit.`);
        return false;
      }
      return true;
    });

    onChange(validFiles);
    // Reset input
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    if (disabled) return;
    onChange(files.filter((_, i) => i !== idx));
  };

  const acceptString = acceptedTypes && acceptedTypes.length > 0 ? acceptedTypes.join(",") : undefined;

  return (
    <div className="space-y-3">
      <div 
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-colors relative",
          error ? "border-destructive bg-destructive/5" : "border-muted-foreground/20 hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="file"
          multiple={allowMultiple}
          accept={acceptString}
          onChange={handleFileChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Click or drag files here</p>
        <p className="text-xs text-muted-foreground mt-1">
          {allowMultiple ? `Up to ${maxFiles} files, ` : ""}
          Max {maxFileSizeMB}MB per file
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center justify-between p-2 text-sm border rounded-lg bg-card">
              <span className="truncate flex-1 mr-2">{file.name}</span>
              <span className="text-xs text-muted-foreground mr-3 shrink-0">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 z-10 relative"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  removeFile(i);
                }}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  error,
  accentColor,
  disabled,
  masked,
}: {
  field: FormField;
  value: FormAnswer;
  onChange: (v: FormAnswer) => void;
  error?: string;
  accentColor: string;
  disabled?: boolean;
  masked?: boolean;
}) {
  const options = field.options ?? [];
  const props = field.properties ?? {};
  const val = field.validation ?? {};

  if (field.type === "section") {
    return (
      <div className="space-y-4">
        <h3 
          className="text-lg font-semibold" 
          style={{ color: accentColor }}
          dangerouslySetInnerHTML={{ __html: sanitize(field.label) }}
        />
        {field.description && (
          <div 
            className="text-sm text-muted-foreground prose-sm max-w-full"
            dangerouslySetInnerHTML={{ __html: sanitize(field.description) }}
          />
        )}
      </div>
    );
  }

  const inputClass = cn(
    "transition-shadow",
    error ? "border-destructive focus-visible:ring-destructive/30" : ""
  );

  switch (field.type) {
    case "short_text":
    case "email":
    case "phone":
    case "url":
    case "number":
      return (
        <Input
          type={
            masked ? "password"
            : field.type === "email" ? "email"
            : field.type === "phone" ? "tel"
            : field.type === "url" ? "url"
            : field.type === "number" ? "number"
            : "text"
          }
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ""}
          className={cn("h-11", inputClass)}
          min={val.min}
          max={val.max}
          minLength={val.minLength}
          maxLength={val.maxLength}
          disabled={disabled}
        />
      );

    case "long_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "Your answer"}
          rows={props.rows ?? 4}
          className={cn(inputClass, masked && "[-webkit-text-security:disc]")}
          disabled={disabled}
        />
      );

    case "date":
    case "time":
    case "datetime":
      return (
        <Input
          type={field.type === "date" ? "date" : field.type === "time" ? "time" : "datetime-local"}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-11 w-auto", inputClass)}
          disabled={disabled}
        />
      );

    case "radio":
      return (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={onChange}
          className="space-y-2"
          disabled={disabled}
        >
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3">
              <RadioGroupItem 
                value={opt.value} 
                id={`${field.id}-${opt.value}`}
                disabled={disabled}
                onClick={(e) => {
                  if (!field.required && value === opt.value) {
                    onChange("");
                  }
                }}
              />
              <Label 
                htmlFor={`${field.id}-${opt.value}`} 
                className="cursor-pointer font-normal flex-1"
                onClick={(e) => {
                  // Standard behavior selects it; if already selected and not required, unselect it.
                  if (!field.required && value === opt.value) {
                    e.preventDefault();
                    onChange("");
                  }
                }}
              >
                <div 
                  className="prose-sm max-w-full [&_img]:max-h-32 [&_img]:w-auto [&_img]:rounded-md"
                  dangerouslySetInnerHTML={{ __html: sanitize(opt.label) }}
                />
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "checkbox": {
      const checked = (value as string[]) ?? [];
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3">
              <Checkbox
                id={`${field.id}-${opt.value}`}
                checked={checked.includes(opt.value)}
                disabled={disabled}
                onCheckedChange={(ch) => {
                  if (ch) onChange([...checked, opt.value]);
                  else onChange(checked.filter((v) => v !== opt.value));
                }}
              />
              <Label htmlFor={`${field.id}-${opt.value}`} className="cursor-pointer font-normal flex-1">
                <div 
                  className="prose-sm max-w-full [&_img]:max-h-32 [&_img]:w-auto [&_img]:rounded-md"
                  dangerouslySetInnerHTML={{ __html: sanitize(opt.label) }}
                />
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case "select":
      return (
        <Select value={(value as string) ?? ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className={cn("h-11", inputClass)}>
            <SelectValue placeholder={field.placeholder ?? "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div 
                  className="prose-sm max-w-full [&_img]:max-h-32 [&_img]:w-auto [&_img]:rounded-md"
                  dangerouslySetInnerHTML={{ __html: sanitize(opt.label) }}
                />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multi_select": {
      const selected = (value as string[]) ?? [];
      return (
        <MultiSelect
          options={options}
          selected={selected}
          onChange={onChange}
          placeholder={field.placeholder ?? "Select options..."}
          accentColor={accentColor}
        />
      );
    }

    case "rating":
      return (
        <StarRating
          stars={props.stars ?? 5}
          value={(value as number) ?? 0}
          onChange={onChange}
          accentColor={accentColor}
        />
      );

    case "scale":
      return (
        <ScaleSelector
          min={props.scaleMin ?? 1}
          max={props.scaleMax ?? 10}
          value={value as number | null}
          onChange={onChange}
          minLabel={props.scaleMinLabel}
          maxLabel={props.scaleMaxLabel}
          accentColor={accentColor}
        />
      );

    case "file":
      return (
        <FileUploadField
          field={field}
          files={(value as unknown as File[]) ?? []}
          onChange={(files) => onChange(files as unknown as FormAnswer)}
          disabled={disabled}
          error={error}
        />
      );

    default:
      return null;
  }
}

export function FormRenderer({ form, fields, sections, logic = [], mode = "public", isAuthenticated = false }: FormRendererProps) {
  const accentColor = form.accentColor ?? "#6366f1";
  const pathname = usePathname();
  const pages = useMemo(() => groupIntoPages(fields, sections), [fields, sections]);

  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef(0);

  // ── Logic runtime ─────────────────────────────────────────────────────────
  const builderFieldsForEngine = useMemo<BuilderField[]>(
    () =>
      fields.map((f) => ({
        id: f.id,
        type: f.type as BuilderField["type"],
        label: f.label,
        description: f.description ?? undefined,
        placeholder: f.placeholder ?? undefined,
        required: f.required,
        orderIndex: f.orderIndex,
        options: f.options ?? undefined,
        validation: f.validation ?? undefined,
        properties: f.properties ?? undefined,
        sectionId: f.sectionId ?? undefined,
      })),
    [fields]
  );

  const engineResult = useMemo(
    () => evaluateLogic(builderFieldsForEngine, logic, answers),
    [builderFieldsForEngine, logic, answers]
  );
  const dynamicStates = engineResult.states;

  // Apply set_value overrides to answers so they reflect in the UI
  useEffect(() => {
    const patch: Record<string, FormAnswer> = {};
    for (const [id, state] of Object.entries(dynamicStates)) {
      if (state.overriddenValue !== undefined && answers[id] !== state.overriddenValue) {
        patch[id] = state.overriddenValue as FormAnswer;
      }
    }
    if (Object.keys(patch).length > 0) {
      setAnswers((prev) => ({ ...prev, ...patch }));
    }
    // answers intentionally excluded from deps: we want to sync only when
    // dynamicStates change, not when the user edits a non-overridden field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicStates]);

  const getDynamicState = useCallback(
    (fieldId: string): FieldDynamicState =>
      dynamicStates[fieldId] ?? {
        visible: true,
        enabled: true,
        required: false,
        masked: false,
      },
    [dynamicStates]
  );
  
  useEffect(() => {
    startTime.current = Date.now();
  }, []);

  const totalPages = pages.length;
  const currentPageData = pages[currentPage] ?? { fields: [] };
  const currentFields = currentPageData.fields;
  const progress = totalPages > 1 ? ((currentPage) / totalPages) * 100 : 0;

  const validatePage = useCallback(() => {
    const newErrors: Record<string, string> = {};
    for (const field of currentFields as FormField[]) {
      if (field.type === "section" || field.type === "page_break") continue;
      const state = getDynamicState(field.id);
      if (!state.visible) continue; // hidden fields are never required
      if (state.required) {
        const val = answers[field.id];
        const isEmpty =
          val === null ||
          val === undefined ||
          val === "" ||
          (Array.isArray(val) && val.length === 0) ||
          (typeof val === "number" && val === 0 && field.type === "rating");
        if (isEmpty) newErrors[field.id] = "This field is required";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentFields, answers, getDynamicState]);

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validatePage()) return;

    // Logic navigation override
    const nav = engineResult.navigation;
    if (nav) {
      if (nav.kind === "page" && typeof nav.targetPageIndex === "number") {
        const idx = Math.max(0, Math.min(nav.targetPageIndex, totalPages - 1));
        setCurrentPage(idx);
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (nav.kind === "section" && nav.targetSectionId) {
        const idx = pages.findIndex((p) =>
          p.fields.some((f) => (f as FormField).sectionId === nav.targetSectionId)
        );
        if (idx >= 0) {
          setCurrentPage(idx);
          setErrors({});
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
      if (nav.kind === "field" && nav.targetFieldId) {
        const idx = pages.findIndex((p) =>
          p.fields.some((f) => f.id === nav.targetFieldId)
        );
        if (idx >= 0) setCurrentPage(idx);
        setErrors({});
        // Defer to allow the page to render before scrolling
        requestAnimationFrame(() => {
          const el = document.getElementById(`field-${nav.targetFieldId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        return;
      }
    }

    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage < totalPages - 1) return; // safety: not on last page
    if (!validatePage()) return;

    // Pre-submit status check
    const statusResult = await getPublicFormStatus(form.id);
    if (statusResult.success && statusResult.data) {
      const { status, acceptResponses } = statusResult.data;
      if (status === "draft") {
        if (mode === "preview") {
          toast.error("This form is not yet published");
        } else {
          setErrors({ _global: "This form is not yet published" });
        }
        return;
      }
      if (!acceptResponses || status === "closed") {
        if (mode === "preview") {
          toast.error("This form is not currently accepting responses");
        } else {
          setErrors({ _global: "This form is not currently accepting responses" });
        }
        return;
      }
    }

    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    const supabase = createClient();
    const tempId = crypto.randomUUID();

    // Strip answers for fields that are currently hidden by logic — they are
    // treated as "not asked", so we don't send stale values to the server.
    const cleanedAnswers: Record<string, FormAnswer> = {};
    for (const [fid, value] of Object.entries(answers)) {
      const state = dynamicStates[fid];
      if (state && !state.visible) continue;
      
      const fieldDef = fields.find(f => f.id === fid);
      
      if (fieldDef?.type === "file" && Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
        // Upload files
        const filePaths: string[] = [];
        for (let i = 0; i < value.length; i++) {
          const file = value[i] as File;
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
          const filePath = `forms/${form.id}/responses/${tempId}/${fileName}`;
          
          const { data, error } = await supabase.storage
            .from("form-uploads")
            .upload(filePath, file);

          if (error) {
            toast.error(`Failed to upload ${file.name}`);
            setSubmitting(false);
            return;
          }
          if (data) {
            filePaths.push(data.path);
          }
        }
        cleanedAnswers[fid] = filePaths as unknown as FormAnswer;
      } else {
        cleanedAnswers[fid] = value;
      }
    }

    const result = await submitFormResponse(form.id, cleanedAnswers, { timeTaken });
    if (result.success) {
      setSubmitted(true);
    } else {
      if (mode === "preview") {
        toast.error(result.error ?? "Submission failed");
      } else {
        setErrors({ _global: result.error ?? "Submission failed" });
      }
    }
    setSubmitting(false);
  };

  // In public mode: show static state screens based on form status
  if (mode === "public") {
    if (form.status === "draft") {
      return (
        <div className="text-center space-y-3 py-8">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Form not available</h2>
          <p className="text-sm text-muted-foreground">
            This form is not currently available.
          </p>
        </div>
      );
    }
    if (!form.acceptResponses || form.status === "closed") {
      return (
        <div className="text-center space-y-3 py-8">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Not accepting responses</h2>
          <p className="text-sm text-muted-foreground">
            This form is not currently accepting responses.
          </p>
        </div>
      );
    }
    if (form.requireAuth && !isAuthenticated) {
      return (
        <div className="text-center space-y-4 py-8">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <UserX className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Sign in required</h2>
          <p className="text-sm text-muted-foreground">
            You need to sign in to submit this form.
          </p>
          <div className="flex gap-3 justify-center pt-1">
            <a
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              Sign in
            </a>
            <a
              href={`/register?next=${encodeURIComponent(pathname)}`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              Create account
            </a>
          </div>
        </div>
      );
    }
  }

  // Success screen
  if (submitted) {
    return (
      <div className="text-center space-y-4 py-10">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: accentColor }} />
        </div>
        <h2 className="text-2xl font-bold">Thank you!</h2>
        <div 
          className="text-muted-foreground prose-neutral max-w-full"
          dangerouslySetInnerHTML={{ __html: sanitize(form.successMessage ?? "Your response has been recorded.") }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Progress bar */}
      {form.showProgress && totalPages > 1 && (
        <div className="mb-6">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1.5 text-right">
            Page {currentPage + 1} of {totalPages}
          </p>
        </div>
      )}

      {/* Global error */}
      {errors._global && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {errors._global}
        </div>
      )}

      {/* Section header — shown when the page represents a named section */}
      {(currentPageData.sectionName || currentPageData.sectionDescription) && (
        <div className="mb-6 pb-4 border-b border-border space-y-2">
          {currentPageData.sectionName && (
            <h2 
              className="text-lg font-semibold prose prose-sm dark:prose-invert max-w-none" 
              style={{ color: accentColor }}
              dangerouslySetInnerHTML={{ __html: sanitize(currentPageData.sectionName) }}
            />
          )}
          {currentPageData.sectionDescription && (
            <div 
              className="text-sm text-muted-foreground prose-sm max-w-full"
              dangerouslySetInnerHTML={{ __html: sanitize(currentPageData.sectionDescription) }}
            />
          )}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-6">
        {(currentFields as FormField[]).map((field) => {
          if (field.type === "section") {
            return (
              <div key={field.id} id={`field-${field.id}`}>
                <FieldRenderer
                  field={field}
                  value={null}
                  onChange={() => {}}
                  accentColor={accentColor}
                />
              </div>
            );
          }

          const state = getDynamicState(field.id);
          if (!state.visible) return null;

          return (
            <div key={field.id} id={`field-${field.id}`} className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
              <div 
                className="prose-sm max-w-full"
                dangerouslySetInnerHTML={{ __html: sanitize(field.label) }}
              />
              {state.required && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            {field.description && (
              <div 
                className="text-xs text-muted-foreground -mt-1 prose-xs max-w-full"
                dangerouslySetInnerHTML={{ __html: sanitize(field.description) }}
              />
            )}
              <FieldRenderer
                field={field}
                value={answers[field.id] ?? null}
                onChange={(v) =>
                  setAnswers((prev) => ({ ...prev, [field.id]: v }))
                }
                error={errors[field.id]}
                accentColor={accentColor}
                disabled={!state.enabled}
                masked={state.masked}
              />
              {errors[field.id] && (
                <p className="text-xs text-destructive">{errors[field.id]}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        {currentPage > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {currentPage < totalPages - 1 ? (
          <Button type="button" onClick={handleNext} style={{ backgroundColor: accentColor, color: "white" }}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: accentColor, color: "white" }}
            className="px-8"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit
          </Button>
        )}
      </div>
    </form>
  );
}
