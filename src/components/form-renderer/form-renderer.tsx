"use client";

import { useState, useCallback, useRef } from "react";
import type { FormField } from "@/db/schema";
import type { Form } from "@/db/schema";
import type { FormAnswer } from "@/lib/form-types";
import { submitFormResponse } from "@/lib/actions/responses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Star, ChevronLeft, ChevronRight, Send, CheckCircle2, Loader2, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormRendererProps {
  form: Form;
  fields: FormField[];
}

const PAGE_BREAK_TYPE = "page_break";

function groupIntoPages(fields: FormField[]): FormField[][] {
  const pages: FormField[][] = [];
  let currentPage: FormField[] = [];
  for (const field of fields) {
    if (field.type === PAGE_BREAK_TYPE) {
      if (currentPage.length > 0) pages.push(currentPage);
      currentPage = [];
    } else {
      currentPage.push(field);
    }
  }
  if (currentPage.length > 0) pages.push(currentPage);
  return pages.length > 0 ? pages : [[]];
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

function FieldRenderer({
  field,
  value,
  onChange,
  error,
  accentColor,
}: {
  field: FormField;
  value: FormAnswer;
  onChange: (v: FormAnswer) => void;
  error?: string;
  accentColor: string;
}) {
  const options = field.options ?? [];
  const props = field.properties ?? {};
  const val = field.validation ?? {};

  if (field.type === "section") {
    return (
      <div>
        <h3 className="text-lg font-semibold" style={{ color: accentColor }}>
          {field.label}
        </h3>
        {field.description && (
          <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
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
            field.type === "email" ? "email"
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
        />
      );

    case "long_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "Your answer"}
          rows={props.rows ?? 4}
          className={inputClass}
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
        />
      );

    case "radio":
      return (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={onChange}
          className="space-y-2"
        >
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3">
              <RadioGroupItem value={opt.value} id={`${field.id}-${opt.value}`} />
              <Label htmlFor={`${field.id}-${opt.value}`} className="cursor-pointer font-normal">
                {opt.label}
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
                onCheckedChange={(ch) => {
                  if (ch) onChange([...checked, opt.value]);
                  else onChange(checked.filter((v) => v !== opt.value));
                }}
              />
              <Label htmlFor={`${field.id}-${opt.value}`} className="cursor-pointer font-normal">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case "select":
      return (
        <Select value={(value as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger className={cn("h-11", inputClass)}>
            <SelectValue placeholder={field.placeholder ?? "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multi_select": {
      const selected = (value as string[]) ?? [];
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3">
              <Checkbox
                id={`${field.id}-${opt.value}`}
                checked={selected.includes(opt.value)}
                onCheckedChange={(ch) => {
                  if (ch) onChange([...selected, opt.value]);
                  else onChange(selected.filter((v) => v !== opt.value));
                }}
              />
              <Label htmlFor={`${field.id}-${opt.value}`} className="cursor-pointer font-normal">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
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
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 text-center text-sm text-muted-foreground">
          <p>File upload coming soon</p>
        </div>
      );

    default:
      return null;
  }
}

export function FormRenderer({ form, fields }: FormRendererProps) {
  const accentColor = form.accentColor ?? "#6366f1";
  const pages = groupIntoPages(fields.filter((f) => f.type !== "page_break"));
  // Rebuild with page breaks to get accurate counts
  const truePages = groupIntoPages(fields);

  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef(Date.now());

  const totalPages = truePages.length;
  const currentFields = truePages[currentPage] ?? [];
  const progress = totalPages > 1 ? ((currentPage) / totalPages) * 100 : 0;

  const validatePage = useCallback(() => {
    const newErrors: Record<string, string> = {};
    for (const field of currentFields) {
      if (field.type === "section" || field.type === "page_break") continue;
      if (field.required) {
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
  }, [currentFields, answers]);

  const handleNext = () => {
    if (!validatePage()) return;
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePage()) return;

    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);

    const result = await submitFormResponse(form.id, answers, { timeTaken });
    if (result.success) {
      setSubmitted(true);
    } else {
      setErrors({ _global: result.error ?? "Submission failed" });
    }
    setSubmitting(false);
  };

  // Closed form
  if (!form.acceptResponses || form.status === "closed") {
    return (
      <div className="text-center space-y-3 py-8">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">This form is closed</h2>
        <p className="text-sm text-muted-foreground">
          This form is no longer accepting responses.
        </p>
      </div>
    );
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
        <p className="text-muted-foreground">{form.successMessage}</p>
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

      {/* Fields */}
      <div className="space-y-6">
        {currentFields.map((field) => {
          if (field.type === "section") {
            return (
              <div key={field.id}>
                <FieldRenderer
                  field={field}
                  value={null}
                  onChange={() => {}}
                  accentColor={accentColor}
                />
              </div>
            );
          }

          return (
            <div key={field.id} className="space-y-2">
              <Label className="text-sm font-medium">
                {field.label}
                {field.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </Label>
              {field.description && (
                <p className="text-xs text-muted-foreground -mt-1">{field.description}</p>
              )}
              <FieldRenderer
                field={field}
                value={answers[field.id] ?? null}
                onChange={(v) =>
                  setAnswers((prev) => ({ ...prev, [field.id]: v }))
                }
                error={errors[field.id]}
                accentColor={accentColor}
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
            onClick={() => setCurrentPage((p) => p - 1)}
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
