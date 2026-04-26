"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { db } from "@/lib/db";
import { FormMenu } from "./form-menu";
import { sanitize } from "@/lib/sanitize";
import type { FormField } from "@/db/schema";
import type { Form } from "@/db/schema";
import type { FormAnswer, BuilderSection, LogicRule, BuilderField, SectionType } from "@/lib/form-types";
import { evaluateLogic, type FieldDynamicState } from "@/lib/form-logic";
import { submitFormResponse, getPublicFormStatus, checkFormStorageQuota } from "@/lib/actions/responses";
import { createClient } from "@/lib/client";
import { SafeHtml } from "@/components/ui/safe-html";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FormRendererProps {
  form: Form;
  fields: FormField[];
  sections?: BuilderSection[];
  logic?: LogicRule[];
  mode?: "preview" | "public";
  isAuthenticated?: boolean;
}

const PAGE_BREAK_TYPE = "page_break";

type RendererPage = {
  sectionId?: string;
  sectionName?: string;
  sectionDescription?: string;
  sectionType?: SectionType;
  nextSectionId?: string;
  fields: FormField[];
};

function groupIntoPages(fields: FormField[], sections?: BuilderSection[]): RendererPage[] {
  const sortedSections = sections && sections.length > 0
    ? [...sections].sort((a, b) => a.orderIndex - b.orderIndex)
    : null;

  if (sortedSections && sortedSections.length > 0) {
    const pages: RendererPage[] = [];
    for (const section of sortedSections) {
      // Success pages are not part of the normal form flow — they are shown post-submit
      if (section.type === "success") continue;

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
            sectionId: section.id,
            sectionName: firstChunk ? section.name : undefined,
            sectionDescription: firstChunk ? section.description : undefined,
            sectionType: section.type ?? "next",
            nextSectionId: section.nextSectionId,
            fields: currentChunk,
          });
          currentChunk = [];
          firstChunk = false;
        } else {
          currentChunk.push(field);
        }
      }
      pages.push({
        sectionId: section.id,
        sectionName: firstChunk ? section.name : undefined,
        sectionDescription: firstChunk ? section.description : undefined,
        sectionType: section.type ?? "next",
        nextSectionId: section.nextSectionId,
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
  required,
}: {
  stars?: number;
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
  required?: boolean;
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
            onClick={() => {
              if (!required && value === num) {
                onChange(0);
              } else {
                onChange(num);
              }
            }}
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
  required,
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number | null) => void;
  minLabel?: string;
  maxLabel?: string;
  accentColor: string;
  required?: boolean;
}) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              if (!required && value === n) {
                onChange(null);
              } else {
                onChange(n);
              }
            }}
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
  const props = (field.properties as any) ?? {};
  const allowMultiple = props.allowMultiple ?? false;
  const maxFiles = props.maxFiles ?? 1;
  const maxFileSizeKB = props.maxFileSize ?? 5000;
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
      if (f.size > maxFileSizeKB * 1024) {
        toast.error(`File ${f.name} exceeds ${maxFileSizeKB}KB limit.`);
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
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <p>
            {allowMultiple ? `Up to ${maxFiles} files, ` : ""}
            Max {maxFileSizeKB}KB per file
          </p>
          {acceptedTypes && acceptedTypes.length > 0 && (
            <p>Allowed types: {acceptedTypes.join(", ")}</p>
          )}
        </div>
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

function VideoRenderer({ properties }: { properties: any }) {
  const { videoSource, videoUrl, assetUrl, aspectRatio = "16/9", autoplay, controls = true, loop } = properties;
  const source = videoSource === "asset" ? assetUrl : videoUrl;
  
  if (!source) return null;

  const getEmbedUrl = (url: string) => {
    try {
      const u = new URL(url);
      // YouTube
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
        const id = u.hostname.includes("youtu.be") 
          ? u.pathname.slice(1) 
          : u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&loop=${loop ? 1 : 0}&controls=${controls ? 1 : 0}&rel=0&modestbranding=1${loop ? `&playlist=${id}` : ""}`;
      }
      // Vimeo
      if (u.hostname.includes("vimeo.com")) {
        const id = u.pathname.split("/").pop();
        if (id) return `https://player.vimeo.com/video/${id}?autoplay=${autoplay ? 1 : 0}&loop=${loop ? 1 : 0}&controls=${controls ? 1 : 0}`;
      }
    } catch (e) {}
    return null;
  };

  const embedUrl = getEmbedUrl(source);
  const ratioClass = aspectRatio === "1/1" ? "aspect-square" : aspectRatio === "4/3" ? "aspect-[4/3]" : "aspect-video";

  return (
    <div className={cn("w-full overflow-hidden rounded-xl border bg-muted/30", ratioClass)}>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          src={source}
          className="h-full w-full object-contain"
          autoPlay={autoplay}
          controls={controls}
          loop={loop}
          muted={autoplay} // Browser policy: autoplay requires mute
          playsInline
        />
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
  onBlur,
}: {
  field: FormField;
  value: FormAnswer;
  onChange: (v: FormAnswer) => void;
  error?: string;
  accentColor: string;
  disabled?: boolean;
  masked?: boolean;
  onBlur?: () => void;
}) {
  const options = field.options ?? [];
  const props = field.properties ?? {};
  const val = field.validation ?? {};

  if (field.type === "section") {
    return (
      <div className="space-y-4">
        <SafeHtml 
          className="text-lg font-semibold" 
          html={field.label}
        />
        {field.description && (
          <SafeHtml 
            className="text-sm text-muted-foreground prose-sm max-w-full preserve-spaces"
            html={field.description}
          />
        )}
      </div>
    );
  }

  if (field.type === "paragraph") {
    return (
      <div className="space-y-2">
        {field.label && field.label !== "Paragraph" && (
          <SafeHtml
            className="text-sm font-medium prose-sm max-w-full preserve-spaces"
            html={field.label}
          />
        )}
        {field.description && (
          <SafeHtml
            className="text-sm text-foreground/80 prose-sm max-w-full preserve-spaces"
            html={field.description}
          />
        )}
      </div>
    );
  }

  if (field.type === "divider") {
    return <div className="h-px w-full bg-border" />;
  }

  if (field.type === "video") {
    return <VideoRenderer properties={field.properties ?? {}} />;
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
          inputMode={
            field.type === "number" ? "decimal"
            : field.type === "phone" ? "tel"
            : field.type === "email" ? "email"
            : field.type === "url" ? "url"
            : undefined
          }
          onKeyDown={(e) => {
            if (field.type === "number" && (e.key === "e" || e.key === "E" || e.key === "+")) {
              e.preventDefault();
            }
          }}
          value={(value as string) ?? ""}
          onChange={(e) => {
            let val = e.target.value;
            if (field.type === "number") {
              // Standard sanitization for numeric input to prevent letters/pasted garbage
              val = val.replace(/[^0-9.-]/g, "");
              
              // Further cleanup: ensure only one decimal point
              const dotIndex = val.indexOf(".");
              if (dotIndex !== -1) {
                val = val.slice(0, dotIndex + 1) + val.slice(dotIndex + 1).replace(/\./g, "");
              }
              
              // Ensure minus sign only at the beginning
              if (val.lastIndexOf("-") > 0) {
                const isNegative = val.startsWith("-");
                val = (isNegative ? "-" : "") + val.replace(/-/g, "");
              }
            }
            onChange(val);
          }}
          placeholder={field.placeholder ?? ""}
          className={cn("h-11", inputClass)}
          min={val.min}
          max={val.max}
          minLength={val.minLength}
          maxLength={val.maxLength}
          disabled={disabled}
          onBlur={onBlur}
          aria-invalid={!!error}
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
          onBlur={onBlur}
          aria-invalid={!!error}
        />
      );

    case "date":
    case "time":
    case "datetime": {
      const nativeType = field.type === "date" ? "date" : field.type === "time" ? "time" : "datetime-local";
      const placeholder = field.placeholder ?? (field.type === "date" ? "Select a date" : field.type === "time" ? "Select a time" : "Select date & time");
      return (
        <Input
          type={value ? nativeType : "text"}
          value={(value as string) ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-11 w-auto", inputClass)}
          disabled={disabled}
          onFocus={(e) => { e.currentTarget.type = nativeType; }}
          onBlur={(e) => {
            if (!e.currentTarget.value) e.currentTarget.type = "text";
            onBlur?.();
          }}
          aria-invalid={!!error}
        />
      );
    }

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

    case "radio_grid": {
      const gridVal = (value as Record<string, string>) ?? {};
      const cols = field.properties?.columns ?? [];
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground" />
                {cols.map((col) => (
                  <th key={col.value} className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {options.map((row) => (
                <tr key={row.value} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4 font-normal">
                    <div
                      className="prose-sm max-w-full"
                      dangerouslySetInnerHTML={{ __html: sanitize(row.label) }}
                    />
                  </td>
                  {cols.map((col) => {
                    const isChecked = gridVal[row.value] === col.value;
                    return (
                      <td key={col.value} className="text-center py-3 px-3">
                        <button
                          type="button"
                          disabled={disabled}
                          className={cn(
                            "h-4 w-4 rounded-full border-2 mx-auto flex items-center justify-center transition-colors",
                            isChecked
                              ? "border-primary bg-primary"
                              : "border-input hover:border-primary/50",
                            disabled && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => {
                            const next = { ...gridVal };
                            if (isChecked && !field.required) {
                              delete next[row.value];
                            } else {
                              next[row.value] = col.value;
                            }
                            onChange(next);
                          }}
                        >
                          {isChecked && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "checkbox_grid": {
      const gridChecked = (value as Record<string, string[]>) ?? {};
      const gridCols = field.properties?.columns ?? [];
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground" />
                {gridCols.map((col) => (
                  <th key={col.value} className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {options.map((row) => {
                const rowChecked = gridChecked[row.value] ?? [];
                return (
                  <tr key={row.value} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-normal">
                      <div
                        className="prose-sm max-w-full"
                        dangerouslySetInnerHTML={{ __html: sanitize(row.label) }}
                      />
                    </td>
                    {gridCols.map((col) => (
                      <td key={col.value} className="text-center py-3 px-3">
                        <Checkbox
                          checked={rowChecked.includes(col.value)}
                          disabled={disabled}
                          className="mx-auto"
                          onCheckedChange={(ch) => {
                            const next = { ...gridChecked };
                            if (ch) {
                              next[row.value] = [...rowChecked, col.value];
                            } else {
                              next[row.value] = rowChecked.filter((v) => v !== col.value);
                              if (next[row.value].length === 0) delete next[row.value];
                            }
                            onChange(next);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    case "select":
      return (
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v === "__clear__" ? "" : v)} disabled={disabled}>
          <SelectTrigger className={cn("h-11", inputClass)}>
            <SelectValue placeholder={field.placeholder ?? "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {!field.required && value && (
              <SelectItem value="__clear__" className="text-muted-foreground italic">
                Clear selection
              </SelectItem>
            )}
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
          className={inputClass}
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
          required={field.required}
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
          required={field.required}
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

  // Find the submit section that was used (for resolving its nextSectionId → success section)
  const submitSection = useMemo(() => {
    if (!sections) return null;
    const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
    return sorted.find((s) => s.type === "submit") ?? null;
  }, [sections]);

  // Find the success section for the post-submit screen.
  // If the submit section has a nextSectionId pointing to a specific success section, use that.
  // Otherwise fall back to the first success section in order.
  const successSection = useMemo(() => {
    if (!sections) return null;
    const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
    if (submitSection?.nextSectionId && submitSection.nextSectionId !== "__auto__") {
      const target = sorted.find((s) => s.id === submitSection.nextSectionId && s.type === "success");
      if (target) return target;
    }
    return sorted.find((s) => s.type === "success") ?? null;
  }, [sections, submitSection]);

  // Fields belonging to the success section (for a custom success page)
  const successFields = useMemo(() => {
    if (!successSection) return [];
    return fields
      .filter((f) => (f as any).sectionId === successSection.id && f.type !== PAGE_BREAK_TYPE)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [successSection, fields]);

  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const startTime = useRef(0);
  const isLoaded = useRef(false);
  const [visitedPages, setVisitedPages] = useState<Set<number>>(new Set([0]));
  const [pageHistory, setPageHistory] = useState<number[]>([0]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ── Autosave logic ────────────────────────────────────────────────────────
  // Load progress on mount
  useEffect(() => {
    if (isLoaded.current) return;
    
    const loadProgress = async () => {
      try {
        const saved = await db.progress.get(form.id);
        if (saved) {
          if (saved.answers && Object.keys(saved.answers).length > 0) {
            setAnswers((prev) => ({ ...prev, ...saved.answers }));
            toast.success("Progress restored", {
              description: "We've restored your previous answers.",
              duration: 3000,
            });
          }
          if (typeof saved.currentPage === "number" && saved.currentPage < pages.length) {
            setCurrentPage(saved.currentPage);
            if (saved.pageHistory && saved.pageHistory.length > 0) {
              setPageHistory(saved.pageHistory);
            }
            if (saved.visitedPages && saved.visitedPages.length > 0) {
              setVisitedPages(new Set(saved.visitedPages));
            }
          }
        }
      } catch (e) {
        console.error("Failed to load saved progress", e);
      } finally {
        isLoaded.current = true;
      }
    };

    loadProgress();
  }, [form.id, pages.length]);

  // Save progress on changes
  useEffect(() => {
    // Don't save if we haven't loaded yet, if we're submitting, or if already submitted
    if (submitted || submitting || !isLoaded.current) return;

    const timer = setTimeout(async () => {
      try {
        let hasData = false;
        
        for (const [_, value] of Object.entries(answers)) {
          if (value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)) {
            hasData = true;
            break;
          }
        }

        // If the form has data OR it previously had data (exists in storage), we save the current state
        // This ensures that "clearing" the form is also persisted.
        const existing = await db.progress.get(form.id);
        if (hasData || currentPage > 0 || existing) {
          await db.progress.put({
            id: form.id,
            answers, // Dexie handles File objects natively
            currentPage,
            updatedAt: Date.now(),
            visitedPages: [...visitedPages],
            pageHistory,
          });
        }
      } catch (e) {
        // Silent fail for storage errors
        console.warn("Autosave failed:", e);
      }
    }, 1000); // Debounce save

    return () => clearTimeout(timer);
  }, [answers, currentPage, form.id, submitted, submitting, visitedPages, pageHistory]);

  const resetProgress = async () => {
    try {
      await db.progress.delete(form.id);
      setAnswers({});
      setCurrentPage(0);
      setVisitedPages(new Set([0]));
      setPageHistory([0]);
      setErrors({});
      toast.success("Progress reset", {
        description: "Your answers have been cleared.",
      });
    } catch (e) {
      toast.error("Failed to reset progress");
    }
  };

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
    // Prevent browser from restoring scroll position on refresh
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    startTime.current = Date.now();
    window.scrollTo(0, 0);
  }, []);

  const totalPages = pages.length;
  const currentPageData = pages[currentPage] ?? { fields: [] };
  const currentFields = currentPageData.fields;
  const progress = totalPages > 1 ? ((currentPage) / totalPages) * 100 : 0;

  // A page is a submit page if its sectionType is 'submit', or if it's the last page (fallback for legacy forms)
  const isSubmitPage = currentPageData.sectionType === "submit" || currentPage === totalPages - 1;

  const hasRequiredFields = useMemo(() => {
    return currentFields.some((field) => {
      if (["section", "page_break", "paragraph", "divider", "video"].includes(field.type)) return false;
      const state = getDynamicState(field.id);
      return state.visible && state.required;
    });
  }, [currentFields, getDynamicState]);

  const validateField = useCallback((fieldId: string, val: FormAnswer) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return null;
    
    const state = getDynamicState(fieldId);
    if (!state.visible) return null;
    
    if (state.required) {
      if (["radio_grid", "checkbox_grid"].includes(field.type)) {
        const rows = (field.options as { label: string; value: string }[]) ?? [];
        const gridVal = (val as unknown as Record<string, unknown>) ?? {};
        for (const row of rows) {
          const rowAnswer = gridVal[row.value];
          if (
            rowAnswer === undefined ||
            rowAnswer === null ||
            rowAnswer === "" ||
            (Array.isArray(rowAnswer) && rowAnswer.length === 0)
          ) {
            return "Please answer all rows";
          }
        }
      } else {
        const isEmpty =
          val === null ||
          val === undefined ||
          val === "" ||
          (Array.isArray(val) && val.length === 0) ||
          (typeof val === "number" && val === 0 && field.type === "rating");
        if (isEmpty) return "This field is required";
      }
    }
    return null;
  }, [fields, getDynamicState]);

  const validatePage = useCallback((shouldFocus = true) => {
    const newErrors: Record<string, string> = {};
    let firstErrorFieldId = null;

    for (const field of currentFields as FormField[]) {
      if (["section", "page_break", "paragraph", "divider"].includes(field.type)) continue;
      
      const error = validateField(field.id, answers[field.id]);
      if (error) {
        newErrors[field.id] = error;
        if (!firstErrorFieldId) firstErrorFieldId = field.id;
      }
    }

    setErrors(newErrors);

    if (firstErrorFieldId && shouldFocus) {
      const el = document.getElementById(`field-${firstErrorFieldId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector("input, textarea, select, button[role='combobox']") as HTMLElement;
        if (input) input.focus({ preventScroll: true });
      }
    }

    return Object.keys(newErrors).length === 0;
  }, [currentFields, answers, validateField]);


  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validatePage()) return;

    // Re-evaluate logic with the current section as the active nav trigger
    const navResult = evaluateLogic(builderFieldsForEngine, logic, answers, currentPageData.sectionId);
    const nav = navResult.navigation;

    if (nav) {
      if (nav.kind === "page" && typeof nav.targetPageIndex === "number") {
        const idx = Math.max(0, Math.min(nav.targetPageIndex, totalPages - 1));
        setCurrentPage(idx);
        setVisitedPages((prev) => new Set(prev).add(idx));
        setPageHistory((prev) => [...prev, idx]);
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (nav.kind === "section" && nav.targetSectionId) {
        const idx = pages.findIndex((p) => p.sectionId === nav.targetSectionId);
        if (idx >= 0) {
          setCurrentPage(idx);
          setVisitedPages((prev) => new Set(prev).add(idx));
          setPageHistory((prev) => [...prev, idx]);
          setErrors({});
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
      if (nav.kind === "field" && nav.targetFieldId) {
        const idx = pages.findIndex((p) =>
          p.fields.some((f) => f.id === nav.targetFieldId)
        );
        if (idx >= 0) {
          setCurrentPage(idx);
          setVisitedPages((prev) => new Set(prev).add(idx));
          setPageHistory((prev) => [...prev, idx]);
        }
        setErrors({});
        requestAnimationFrame(() => {
          const el = document.getElementById(`field-${nav.targetFieldId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        return;
      }
      if (nav.kind === "url" && nav.targetUrl) {
        window.location.href = nav.targetUrl;
        return;
      }
    }

    // Section-level default destination (nextSectionId)
    if (currentPageData.nextSectionId && currentPageData.nextSectionId !== "__auto__") {
      const idx = pages.findIndex((p) => p.sectionId === currentPageData.nextSectionId);
      if (idx >= 0) {
        setCurrentPage(idx);
        setVisitedPages((prev) => new Set(prev).add(idx));
        setPageHistory((prev) => [...prev, idx]);
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    // Fallback: next sequential page
    const nextPage = Math.min(currentPage + 1, totalPages - 1);
    setCurrentPage(nextPage);
    setVisitedPages((prev) => new Set(prev).add(nextPage));
    setPageHistory((prev) => [...prev, nextPage]);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || submitting) return;

    // Turnstile check
    const isBypassed = mode === "preview" && form.previewBypass;
    if (isSubmitPage && !turnstileToken && !isBypassed) {
      toast.error("Please complete the security check");
      return;
    }

    if (!validatePage()) {
      return;
    }

    // Pre-submit status check
    const statusResult = await getPublicFormStatus(form.id);
    if (statusResult.success && statusResult.data) {
      const { status, acceptResponses } = statusResult.data;
      const isBypassed = mode === "preview" && form.previewBypass;

      if (status === "draft" && !isBypassed) {
        if (mode === "preview") {
          toast.error("This form is not yet published");
        } else {
          setErrors({ _global: "This form is not yet published" });
        }
        return;
      }
      if ((!acceptResponses || status === "closed") && !isBypassed) {
        if (mode === "preview") {
          toast.error("This form is not currently accepting responses");
        } else {
          setErrors({ _global: "This form is not currently accepting responses" });
        }
        return;
      }
    }

    setShowConfirmDialog(true);
  };

  const performSubmit = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);

    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    const supabase = createClient();
    const tempId = crypto.randomUUID();

    // Build the set of field IDs on pages the user actually visited.
    // Answers from skipped pages are treated as stale and excluded.
    const visitedFieldIds = new Set<string>();
    for (const pageIdx of visitedPages) {
      const page = pages[pageIdx];
      if (page) {
        for (const f of page.fields) visitedFieldIds.add(f.id);
      }
    }

    // First, calculate total size of all pending uploads
    let totalUploadSize = 0;
    for (const [fid, value] of Object.entries(answers)) {
      const state = dynamicStates[fid];
      if (state && !state.visible) continue;
      if (!visitedFieldIds.has(fid)) continue;
      const fieldDef = fields.find(f => f.id === fid);
      if (fieldDef?.type === "file" && Array.isArray(value) && value.length > 0 && (value[0] as any) instanceof File) {
        for (let i = 0; i < value.length; i++) {
          totalUploadSize += (value[i] as unknown as File).size;
        }
      }
    }

    // Check quota if there are uploads
    if (totalUploadSize > 0) {
      const quotaCheck = await checkFormStorageQuota(form.id, totalUploadSize);
      if (!quotaCheck.success) {
        if (mode === "preview") {
           toast.error(quotaCheck.error ?? "Form owner has reached their file limit.");
        } else {
           setErrors({ _global: quotaCheck.error ?? "Form owner has reached their file limit." });
        }
        setSubmitting(false);
        return;
      }
    }

    // Strip answers for fields that are currently hidden by logic or on
    // pages the user never visited — they are treated as "not asked",
    // so we don't send stale values to the server.
    const cleanedAnswers: Record<string, FormAnswer> = {};
    const uploadStats: { name: string; originalName: string; size: number; mimeType: string; path: string }[] = [];

    for (const [fid, value] of Object.entries(answers)) {
      const state = dynamicStates[fid];
      if (state && !state.visible) continue;
      if (!visitedFieldIds.has(fid)) continue;
      
      const fieldDef = fields.find(f => f.id === fid);
      
      if (fieldDef?.type === "file" && Array.isArray(value) && value.length > 0 && (value[0] as any) instanceof File) {
        // Upload files
        const filePaths: string[] = [];
        for (let i = 0; i < value.length; i++) {
          const file = value[i] as unknown as File;
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
            uploadStats.push({
              name: file.name,
              originalName: file.name,
              size: file.size,
              mimeType: file.type || "application/octet-stream",
              path: data.path,
            });
          }
        }
        cleanedAnswers[fid] = filePaths as unknown as FormAnswer;
      } else {
        cleanedAnswers[fid] = value;
      }
    }

    const result = await submitFormResponse(form.id, cleanedAnswers, { 
      timeTaken, 
      uploads: uploadStats,
      turnstileToken: turnstileToken ?? undefined,
      previewBypass: mode === "preview" && form.previewBypass
    });
    if (result.success) {
      setSubmitted(true);
      await db.progress.delete(form.id);
    } else {
      if (mode === "preview") {
        toast.error(result.error ?? "Submission failed");
      } else {
        setErrors({ _global: result.error ?? "Submission failed" });
      }
      
      // Reset turnstile on error to get a fresh token
      turnstileRef.current?.reset();
      setTurnstileToken(null);
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
    // Custom success page from a success-type section
    if (successSection && successFields.length > 0) {
      return (
        <div className="space-y-6 py-6">
          {(successSection.name || successSection.description) && (
            <div className="mb-6 pb-4 border-b border-border space-y-2">
              {successSection.name && (
                <h2
                  className="text-lg font-semibold prose prose-sm dark:prose-invert max-w-none"
                  style={{ color: accentColor }}
                  dangerouslySetInnerHTML={{ __html: sanitize(successSection.name) }}
                />
              )}
              {successSection.description && (
                <SafeHtml
                  className="text-sm text-foreground/80 prose-sm max-w-full preserve-spaces"
                  html={successSection.description}
                />
              )}
            </div>
          )}
          <div className="space-y-6">
            {successFields.map((field) => (
              <div key={field.id} id={`field-${field.id}`}>
                <FieldRenderer
                  field={field}
                  value={null}
                  onChange={() => {}}
                  accentColor={accentColor}
                  disabled
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default success screen
    return (
      <div className="text-center space-y-4 py-10">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: accentColor }} />
        </div>
        <h2 className="text-2xl font-bold">Thank you!</h2>
        <SafeHtml 
          className="text-foreground/80 prose-neutral max-w-full preserve-spaces"
          html={form.successMessage ?? "Your response has been recorded."}
        />
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <FormMenu onReset={resetProgress} />
      </div>
      <form onSubmit={handlePreSubmit} noValidate>
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
            <SafeHtml 
              className="text-sm text-foreground/80 prose-sm max-w-full preserve-spaces"
              html={currentPageData.sectionDescription}
            />
          )}
        </div>
      )}

      {/* Required indicator */}
      {hasRequiredFields && (
        <div className="mb-6 text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1 duration-300">
          * Indicates required question
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

          if (["paragraph", "divider", "video"].includes(field.type)) {
            const state = getDynamicState(field.id);
            if (!state.visible) return null;
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
              <SafeHtml 
                className="text-xs text-foreground/80 -mt-1 prose-xs max-w-full preserve-spaces"
                html={field.description}
              />
            )}
              <FieldRenderer
                field={field}
                value={answers[field.id] ?? null}
                onChange={(v) => {
                  setAnswers((prev) => ({ ...prev, [field.id]: v }));
                  
                  // Real-time validation
                  const error = validateField(field.id, v);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (error) next[field.id] = error;
                    else delete next[field.id];
                    return next;
                  });
                }}
                onBlur={() => {
                  const error = validateField(field.id, answers[field.id]);
                  if (error) {
                    setErrors((prev) => ({ ...prev, [field.id]: error }));
                  }
                }}
                accentColor={accentColor}
                disabled={!state.enabled}
                masked={state.masked}
                error={errors[field.id]}
              />
              {errors[field.id] && (
                <p className="text-xs text-destructive">{errors[field.id]}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Turnstile check */}
      {isSubmitPage && !submitted && !(mode === "preview" && form.previewBypass) && (
        <div className="flex justify-center my-6">
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
            onSuccess={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        {pageHistory.length > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const prevPage = pageHistory.length > 1
                ? pageHistory[pageHistory.length - 2]
                : 0;
              setPageHistory((prev) => prev.slice(0, -1));
              setCurrentPage(prevPage);
              setErrors({});
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {isSubmitPage ? (
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
        ) : (
          <Button type="button" onClick={handleNext} style={{ backgroundColor: accentColor, color: "white" }}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </form>

    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ready to submit?</AlertDialogTitle>
          <AlertDialogDescription>
            Please review your answers before submitting. Once submitted, you may not be able to change them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Review Answers</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              performSubmit();
            }}
            disabled={submitting}
            style={{ backgroundColor: accentColor, color: "white" }}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Confirm Submission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
