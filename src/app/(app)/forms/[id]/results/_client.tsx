"use client";

import { useState, useMemo, useEffect } from "react";
import type { Form, FormField } from "@/db/schema";
import type { ResponseRow, FormAnswer } from "@/lib/form-types";
import { deleteResponse, deleteResponses, exportResponsesCSV, getFormResponsesForExport } from "@/lib/actions/responses";
import { createClient } from "@/lib/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trash2, Download, Inbox, Star, Clock, Mail, Search, Users, Calendar, ArrowUpDown, ChevronRight, ClipboardList, Paperclip,
  FileSpreadsheet, FileText, FileCode, CheckCircle2, Loader2, Sheet as SheetIcon
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sanitize, stripHtml } from "@/lib/sanitize";
import { motion, AnimatePresence } from "motion/react";

interface ResultsClientProps {
  formId: string;
  form: Form;
  fields: FormField[];
  initialResponses: { responses: ResponseRow[]; total: number };
}

function FileLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.storage.from("form-uploads").createSignedUrl(path, 3600);
      if (data?.signedUrl) setUrl(data.signedUrl);
    }
    load();
  }, [path]);

  const filename = path.split("/").pop() ?? "file";
  // Remove timestamp prefix if it exists (digits followed by underscore)
  const cleanName = filename.replace(/^\d+_/, '');

  if (!url) return <span className="text-muted-foreground animate-pulse text-xs">Loading link...</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-lg w-fit border border-primary/20 transition-colors hover:bg-primary/20">
      <Paperclip className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate max-w-[200px]">{cleanName}</span>
    </a>
  );
}

function formatAnswer(val: FormAnswer, field: FormField): string {
  if (val === null || val === undefined || val === "") return "—";
  if (field.type === "file") {
    if (Array.isArray(val)) {
      return val.map((path) => {
        const name = String(path).split('/').pop() || String(path);
        return name.replace(/^\d+_/, '');
      }).join(", ");
    }
    return String(val);
  }
  if (Array.isArray(val)) {
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
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}


function formatTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(date);
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function StatCard({ title, value, icon: Icon, description }: { 
  title: string; 
  value: string | number; 
  icon: any; 
  description?: string 
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function ResultsClient({ formId, form, fields, initialResponses }: ResultsClientProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [responses, setResponses] = useState(initialResponses?.responses ?? []);

  const [total, setTotal] = useState(initialResponses?.total ?? 0);
  const [selectedResponse, setSelectedResponse] = useState<ResponseRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [multiDeleteOpen, setMultiDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<"csv" | "excel" | "pdf" | null>(null);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? processedResponses.map((r) => r.id) : []);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const handleBulkDelete = async () => {
    setIsDeletingBulk(true);
    const result = await deleteResponses(selectedIds, formId);
    setIsDeletingBulk(false);
    if (result.success) {
      setResponses((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setTotal((t) => t - selectedIds.length);
      setSelectedIds([]);
      setMultiDeleteOpen(false);
      toast.success("Responses deleted");
    } else {
      toast.error(result.error ?? "Failed to delete responses");
    }
  };

  if (!form || !fields) return null;

  const dataFields = fields.filter((f) => f && !["section", "page_break", "paragraph", "divider"].includes(f.type));
  const accentColor = form.accentColor ?? "#6366f1";

  // Filtered & Sorted Responses
  const processedResponses = useMemo(() => {
    let result = [...responses];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.respondentEmail?.toLowerCase().includes(query)) ||
        Object.values(r.answers).some(a => String(a).toLowerCase().includes(query))
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [responses, searchQuery, sortBy]);

  // Stats Calculations
  const stats = useMemo(() => {
    if (responses.length === 0) return null;
    
    const times = responses
      .map(r => r.metadata?.timeTaken)
      .filter((t): t is number => typeof t === "number");
    
    const avgTime = times.length 
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null;
    
    const lastResponse = responses[0]?.submittedAt;

    return { avgTime, lastResponse };
  }, [responses]);

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

  const handleExport = async (type: "csv" | "excel" | "pdf") => {
    setExporting(true);
    setExportType(type);
    
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await getFormResponsesForExport(formId, tz);

    if (result.success && result.data) {
      const { headers, rows, title } = result.data;
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const cleanTitle = stripHtml(title).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${cleanTitle}_export_${timestamp}`;

      try {
        if (type === "csv") {
          const csv = Papa.unparse({ 
            fields: headers, 
            data: rows 
          }, { 
            escapeFormulae: true 
          });
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileName}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (type === "excel") {
          const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
          XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } else if (type === "pdf") {
          const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
          
          // Add Title
          doc.setFontSize(18);
          doc.text(stripHtml(title), 14, 22);
          doc.setFontSize(11);
          doc.setTextColor(100);
          doc.text(`Exported on ${new Date().toLocaleString()}`, 14, 30);
          
          // Prepare rows for PDF: Truncate IDs and shorten long URLs/text
          const fileIndex = headers.indexOf("Upload File");
          const pdfRows = rows.map(row => row.map((cell, i) => {
            if (i === 0) return String(cell).substring(0, 8); // Truncate ID
            if (i === fileIndex && String(cell).startsWith("http")) {
              return "File Link (See CSV/Excel)"; // Simplify URLs in PDF
            }
            return String(cell);
          }));

          autoTable(doc, {
            head: [headers],
            body: pdfRows,
            startY: 40,
            theme: "striped",
            headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
            styles: { 
              fontSize: 7, 
              cellPadding: 2, 
              overflow: 'ellipsize', // Use ellipsize to prevent vertical text
              minCellWidth: 15
            },
            alternateRowStyles: { fillColor: [245, 247, 255] },
            margin: { top: 40, bottom: 20, left: 10, right: 10 },
            rowPageBreak: 'auto',
            pageBreak: 'auto',
          });
          
          doc.save(`${fileName}.pdf`);
        }
        toast.success(`Exported as ${type.toUpperCase()} successfully`);
        setExportDialogOpen(false);
      } catch (err) {
        console.error(`Export ${type} error:`, err);
        toast.error(`Failed to generate ${type.toUpperCase()} file`);
      }
    } else {
      toast.error(result.error ?? "Export failed");
    }
    setExporting(false);
    setExportType(null);
  };

  const RespondentAvatar = ({ email }: { email?: string | null }) => {
    const initials = email ? email.substring(0, 2).toUpperCase() : "A";
    const bgColors = ["bg-indigo-500/10 text-indigo-600", "bg-rose-500/10 text-rose-600", "bg-emerald-500/10 text-emerald-600", "bg-amber-500/10 text-amber-600"];
    const colorIndex = email ? (email.length % bgColors.length) : 0;
    
    return (
      <Avatar size="sm" className={cn("size-7 transition-transform group-hover:scale-105", bgColors[colorIndex])}>
        <AvatarFallback className="bg-transparent text-[10px] font-bold">{initials}</AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Bulk Action Bar (Overlay) */}
      {selectedIds.length > 0 && (
        <div className="absolute top-0 inset-x-0 h-16 bg-primary/5 border-b border-primary/20 flex items-center justify-between px-8 z-20 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
             <Checkbox 
               checked={selectedIds.length === processedResponses.length && processedResponses.length > 0}
               onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
             />
             <span className="text-sm font-medium">{selectedIds.length} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2 h-9 px-4"
              onClick={() => setMultiDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto relative scrollbar-edge transition-all duration-300", selectedIds.length > 0 ? "mt-16" : "")}>
        <div className="p-4 pt-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight prose prose-xl dark:prose-invert max-w-none mb-0.5" dangerouslySetInnerHTML={{ __html: sanitize(form.title) }} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={total === 0}
            className="rounded-full shadow-sm px-4 bg-background hover:bg-muted transition-all active:scale-95"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Total Submissions" 
          value={total} 
          icon={Users} 
          description="Across all versions"
        />
        <StatCard 
          title="Avg. Completion Time" 
          value={stats?.avgTime ? `${Math.floor(stats.avgTime / 60)}m ${stats.avgTime % 60}s` : "—"} 
          icon={Clock} 
          description="Based on recent data"
        />
        <StatCard 
          title="Last Submission" 
          value={stats?.lastResponse && mounted ? formatTimeAgo(stats.lastResponse) : "—"} 
          icon={Calendar} 
          description="Fresh off the press"
        />

      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-2 rounded-xl border border-border/40 backdrop-blur-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search responses or emails..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-lg py-3 h-10"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-8 whitespace-nowrap rounded-lg"
            onClick={() => setSortBy(s => s === "newest" ? "oldest" : "newest")}
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            Sorted by {sortBy === "newest" ? "Newest" : "Oldest"}
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1 hidden md:block" />
          <div className="text-xs text-muted-foreground px-2 whitespace-nowrap">
            Showing {processedResponses.length} of {total}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {processedResponses.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-dashed border-border/60 rounded-3xl p-20 text-center bg-muted/10"
          >
            <div className="bg-muted p-4 rounded-full w-fit mx-auto mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-lg">No responses found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? "Try a different search term" : "Share your form to start collecting data."}
            </p>
          </motion.div>
        ) : (
          <div key="content" className="space-y-4">
            {/* Desktop Table View */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hidden md:block rounded-2xl border border-border/80 bg-background overflow-hidden shadow-sm shadow-black/5"
            >
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[50px] pl-6">
                        <Checkbox 
                          checked={selectedIds.length === processedResponses.length && processedResponses.length > 0}
                          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        />
                      </TableHead>
                      <TableHead className="w-[80px] text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Row</TableHead>
                      <TableHead className="w-[180px] text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Submitted</TableHead>
                      <TableHead className="w-[200px] text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Respondent</TableHead>
                      <TableHead className="w-[150px] text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Performance</TableHead>
                      <TableHead className="w-[100px] text-right text-[10px] font-bold uppercase tracking-wider h-11 py-0 px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedResponses.map((r, i) => {
                      const isSelected = selectedIds.includes(r.id);
                      return (
                        <TableRow
                          key={r.id}
                          className={cn(
                            "group cursor-pointer hover:bg-muted/50 transition-colors",
                            isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
                          )}
                          onClick={() => setSelectedResponse(r)}
                        >
                          <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleSelect(r.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                            #{(sortBy === "newest" ? total - i : i + 1).toString().padStart(2, '0')}
                          </TableCell>
                        <TableCell className="text-sm font-medium">
                          <div className="flex flex-col">
                            <span>{mounted ? formatDateTime(r.submittedAt) : "—"}</span>
                            <span className="text-[10px] text-muted-foreground">{mounted ? formatTimeAgo(r.submittedAt) : "—"}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <RespondentAvatar email={r.respondentEmail} />
                            <span className="text-sm text-foreground truncate max-w-[140px]">
                              {r.respondentEmail ?? "Anonymous"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Clock size={12} className="text-muted-foreground" />
                              {r.metadata?.timeTaken ? formatDuration(r.metadata.timeTaken) : "—"}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                              <div className="size-1.5 rounded-full bg-emerald-500" />
                              Submitted
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg group-hover:opacity-100 opacity-0 transition-opacity"
                              onClick={() => setDeleteId(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </motion.div>

            <div className="md:hidden space-y-4">
              {processedResponses.map((r, i) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    key={r.id}
                    onClick={() => setSelectedResponse(r)}
                    className="active:scale-[0.98] transition-all"
                  >
                    <Card className={cn(
                      "shadow-none overflow-hidden transition-all duration-300",
                      isSelected ? "border-primary ring-1 ring-primary bg-primary/[0.02]" : "border-border/80"
                    )}>
                      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0 relative">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleSelect(r.id, checked as boolean)}
                            />
                            <Avatar className="h-9 w-9 border border-border/50">
                              <AvatarFallback className="text-[10px] bg-primary/5">
                                {r.respondentEmail?.charAt(0).toUpperCase() ?? "A"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold truncate max-w-[180px]">
                              {r.respondentEmail ?? "Anonymous Respondent"}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-bold h-5 px-1.5 border-border/40 transition-colors",
                          isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background/50"
                        )}>
                          #{(sortBy === "newest" ? total - i : i + 1).toString().padStart(2, '0')}
                        </Badge>
                      </CardHeader>
                    <CardContent className="px-5 pb-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Submitted</span>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                            <Calendar size={12} className="text-primary" />
                            {mounted ? formatDateTime(new Date(r.submittedAt)) : "—"}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {mounted ? formatTimeAgo(new Date(r.submittedAt)) : "—"}
                          </span>

                        </div>
                        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Performance</span>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                            <Clock size={12} className="text-primary" />
                            {r.metadata?.timeTaken ? formatDuration(r.metadata.timeTaken) : "No record"}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                            <div className="size-1.5 rounded-full bg-emerald-500" />
                            Submitted
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <div className="px-5 py-4 flex items-center justify-between bg-muted/5 border-t border-border/40">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        View Details
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(r.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <div className="bg-primary/5 p-6 pb-4 border-b border-primary/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                Export Responses
              </DialogTitle>
              <DialogDescription className="text-sm pt-0.5">
                Select a format to download your data.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-4 bg-background">
            <div className="grid grid-cols-3 gap-3">
              {[
                { 
                  id: "csv", 
                  label: "CSV", 
                  desc: "Raw Data", 
                  icon: FileSpreadsheet, 
                  color: "text-blue-500", 
                  bg: "bg-blue-500/10",
                  border: "border-blue-500/20"
                },
                { 
                  id: "excel", 
                  label: "Excel", 
                  desc: "Sheet", 
                  icon: SheetIcon, 
                  color: "text-emerald-500", 
                  bg: "bg-emerald-500/10",
                  border: "border-emerald-500/20"
                },
                { 
                  id: "pdf", 
                  label: "PDF", 
                  desc: "Print", 
                  icon: FileText, 
                  color: "text-rose-500", 
                  bg: "bg-rose-500/10",
                  border: "border-rose-500/20"
                }
              ].map((opt) => (
                <button
                  key={opt.id}
                  disabled={exporting}
                  onClick={() => handleExport(opt.id as any)}
                  className={cn(
                    "group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300",
                    "hover:shadow-sm hover:-translate-y-0.5 active:scale-95",
                    opt.border,
                    exporting && exportType === opt.id ? "ring-2 ring-primary bg-primary/5" : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className={cn("p-2.5 rounded-xl mb-2 transition-transform group-hover:scale-105", opt.bg)}>
                    {exporting && exportType === opt.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <opt.icon className={cn("h-5 w-5", opt.color)} />
                    )}
                  </div>
                  <span className="font-bold text-xs mb-0.5">{opt.label}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{opt.desc}</span>
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-tight">
                Includes <span className="font-bold text-foreground">{total} responses</span> with full metadata and timestamps.
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-muted/20 border-t border-border/40 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setExportDialogOpen(false)} disabled={exporting} className="rounded-lg font-medium h-8">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Response Detail Drawer */}
      <Sheet open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <SheetContent className="h-full w-full sm:w-[500px] p-0 overflow-hidden flex flex-col gap-0 border-l border-border/50">
          <div className="p-6 pb-4 border-b border-border/40 bg-muted/10 shrink-0">
            <SheetHeader className="text-left space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none transition-colors px-2.5">
                  Response Details
                </Badge>
                {selectedResponse && (
                  <span className="text-xs font-mono text-muted-foreground">
                    ID: {selectedResponse.id.substring(0, 8)}
                  </span>
                )}
              </div>
              <SheetTitle className="text-xl font-bold flex items-center gap-3">
                <RespondentAvatar email={selectedResponse?.respondentEmail} />
                <span className="truncate min-w-0 flex-1">{selectedResponse?.respondentEmail ?? "Anonymous Respondent"}</span>
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 pt-1 font-medium">
                <Calendar className="h-3.5 w-3.5" />
                Submitted on {selectedResponse && mounted ? formatDateTime(selectedResponse.submittedAt) : "—"}
              </SheetDescription>

            </SheetHeader>
          </div>

          <ScrollArea className="flex-1 min-h-0 px-6 pt-6">
            <div className="space-y-8 pb-12">
              {/* Technical Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 p-3 rounded-2xl border border-border/40">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Time Taken</p>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={14} className="text-primary" />
                    {selectedResponse?.metadata?.timeTaken 
                      ? formatDuration(selectedResponse.metadata.timeTaken)
                      : "No record"}
                  </p>
                </div>
                <div className="bg-muted/30 p-3 rounded-2xl border border-border/40">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Status</p>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Submitted
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {selectedResponse && dataFields.map((field) => {
                  const answer = selectedResponse.answers[field.id] ?? null;
                  return (
                    <div key={field.id} className="group/field relative">
                      <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/20 rounded-full opacity-0 group-hover/field:opacity-100 transition-opacity" />
                      <div 
                        className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 prose prose-sm dark:prose-invert max-w-full break-words"
                        dangerouslySetInnerHTML={{ __html: sanitize(field.label) + (field.required ? ' <span class="text-destructive">*</span>' : '') }}
                      />
                      <div className="relative">
                        {answer === null || answer === "" || (Array.isArray(answer) && answer.length === 0) ? (
                          <div className="text-sm text-muted-foreground italic bg-muted/20 p-3 rounded-xl border border-dashed border-border/60">
                            No answer provided
                          </div>
                        ) : field.type === "rating" ? (
                          <div className="flex items-center gap-1.5 bg-muted/10 p-3 rounded-xl border border-border/40 w-fit">
                            <div className="flex gap-0.5">
                              {Array.from({ length: field.properties?.stars ?? 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="h-5 w-5"
                                  fill={i < Number(answer) ? accentColor : "transparent"}
                                  color={i < Number(answer) ? accentColor : "#94a3b8"}
                                />
                              ))}
                            </div>
                            <span className="ml-2 font-bold text-sm text-primary">
                              {answer} / {field.properties?.stars ?? 5}
                            </span>
                          </div>
                        ) : field.type === "file" ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Array.isArray(answer) ? answer.map((path, i) => (
                               <FileLink key={i} path={String(path)} />
                            )) : <FileLink path={String(answer)} />}
                          </div>
                        ) : field.type === "long_text" ? (
                          <div 
                            className="bg-muted/20 border border-border/40 rounded-2xl p-4 text-sm leading-relaxed shadow-inner prose prose-sm dark:prose-invert max-w-none [&_img]:rounded-xl [&_img]:border [&_img]:border-border/40"
                            dangerouslySetInnerHTML={{ __html: sanitize(String(answer)) }}
                          />
                        ) : (
                          <div 
                            className="bg-muted/10 border border-border/40 rounded-xl p-3 px-4 text-sm font-medium prose prose-sm dark:prose-invert max-w-full break-words [&_p]:m-0 [&_img]:max-h-32 [&_img]:w-auto [&_img]:rounded-lg [&_img]:my-2"
                            dangerouslySetInnerHTML={{ __html: sanitize(formatAnswer(answer, field)) }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-6 border-t border-border/40 bg-muted/5 shrink-0">
            <Button
              variant="outline"
              size="lg"
              className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive rounded-xl"
              disabled={!selectedResponse}
              onClick={() => {
                if (selectedResponse) {
                  setDeleteId(selectedResponse.id);
                  setSelectedResponse(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete Response?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete this response from your records. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Multi-Delete Confirm */}
      <AlertDialog open={multiDeleteOpen} onOpenChange={setMultiDeleteOpen}>
        <AlertDialogContent className="rounded-3xl border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete {selectedIds.length} Responses?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete the selected responses from your records. This action is irreversible and will also remove all associated files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl" disabled={isDeletingBulk}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {isDeletingBulk ? "Deleting..." : "Delete All Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
