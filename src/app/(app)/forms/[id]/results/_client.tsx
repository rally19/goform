"use client";

import { useState } from "react";
import type { Form, FormField } from "@/db/schema";
import type { ResponseRow, FormAnswer } from "@/lib/form-types";
import { deleteResponse, exportResponsesCSV } from "@/lib/actions/responses";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Trash2, Download, Inbox, ClipboardList, Star, Clock, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ResultsClientProps {
  formId: string;
  form: Form;
  fields: FormField[];
  initialResponses: { responses: ResponseRow[]; total: number };
}

function formatAnswer(val: FormAnswer, field: FormField): string {
  if (val === null || val === undefined || val === "") return "—";
  if (Array.isArray(val)) {
    // Map values to labels if options exist
    if (field.options) {
      return val
        .map((v) => field.options!.find((o) => o.value === v)?.label ?? v)
        .join(", ");
    }
    return val.join(", ");
  }
  if (field.type === "radio" || field.type === "select") {
    const opt = field.options?.find((o) => o.value === val);
    return opt?.label ?? String(val);
  }
  if (field.type === "rating") {
    return `${"★".repeat(Number(val))}${"☆".repeat((field.properties?.stars ?? 5) - Number(val))}`;
  }
  return String(val);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function ResultsClient({ formId, form, fields, initialResponses }: ResultsClientProps) {
  const [responses, setResponses] = useState(initialResponses.responses);
  const [total, setTotal] = useState(initialResponses.total);
  const [selectedResponse, setSelectedResponse] = useState<ResponseRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const dataFields = fields.filter((f) => f.type !== "section" && f.type !== "page_break");
  const accentColor = form.accentColor ?? "#6366f1";

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteResponse(deleteId, formId);
    if (result.success) {
      setResponses((r) => r.filter((x) => x.id !== deleteId));
      setTotal((t) => t - 1);
      if (selectedResponse?.id === deleteId) setSelectedResponse(null);
      toast.success("Response deleted");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
    setDeleteId(null);
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportResponsesCSV(formId);
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.title}-responses.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported successfully");
    } else {
      toast.error(result.error ?? "Export failed");
    }
    setExporting(false);
  };

  return (
    <div className="p-4 pt-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Results</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total} {total === 1 ? "response" : "responses"} total
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting || total === 0}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Table */}
      {responses.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No responses yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Share your form to start collecting responses.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Submitted</TableHead>
                  <TableHead className="w-[160px]">Respondent</TableHead>
                  {dataFields.slice(0, 3).map((f) => (
                    <TableHead key={f.id} className="max-w-[200px]">
                      <span className="truncate block">{f.label}</span>
                    </TableHead>
                  ))}
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedResponse(r)}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(r.submittedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.respondentEmail ?? "Anonymous"}
                    </TableCell>
                    {dataFields.slice(0, 3).map((f) => (
                      <TableCell key={f.id} className="text-sm max-w-[200px]">
                        <span className="truncate block">
                          {formatAnswer(r.answers[f.id] ?? null, f)}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Response Detail Drawer */}
      <Sheet open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <SheetContent className="w-[420px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Response Details</SheetTitle>
            <SheetDescription>
              Submitted {selectedResponse ? formatDateTime(selectedResponse.submittedAt) : ""}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-4 pr-4">
              {/* Meta info */}
              <div className="flex flex-wrap gap-2">
                {selectedResponse?.respondentEmail && (
                  <div className="flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-md">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {selectedResponse.respondentEmail}
                  </div>
                )}
                {selectedResponse?.metadata?.timeTaken && (
                  <div className="flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-md">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    Completed in {
                      selectedResponse.metadata.timeTaken < 60
                        ? `${selectedResponse.metadata.timeTaken}s`
                        : `${Math.floor(selectedResponse.metadata.timeTaken / 60)}m ${selectedResponse.metadata.timeTaken % 60}s`
                    }
                  </div>
                )}
              </div>

              <Separator />

              {/* Answers */}
              {selectedResponse && dataFields.map((field) => {
                const answer = selectedResponse.answers[field.id] ?? null;
                return (
                  <div key={field.id} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    <div className="text-sm">
                      {answer === null || answer === "" || (Array.isArray(answer) && answer.length === 0) ? (
                        <span className="text-muted-foreground italic">No answer</span>
                      ) : field.type === "rating" ? (
                        <div className="flex gap-0.5">
                          {Array.from({ length: field.properties?.stars ?? 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4"
                              fill={i < Number(answer) ? accentColor : "transparent"}
                              color={i < Number(answer) ? accentColor : "#94a3b8"}
                            />
                          ))}
                          <span className="ml-2 text-muted-foreground text-xs self-center">
                            {answer}/{field.properties?.stars ?? 5}
                          </span>
                        </div>
                      ) : field.type === "long_text" ? (
                        <p className="whitespace-pre-wrap bg-muted rounded-md p-3 text-sm">
                          {String(answer)}
                        </p>
                      ) : (
                        <p className="font-medium">{formatAnswer(answer, field)}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Delete button */}
              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setDeleteId(selectedResponse!.id);
                  setSelectedResponse(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete this response
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Response?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this response. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
