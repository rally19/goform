"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import {
  Copy, MoreHorizontal, Plus, Search, Settings, SquarePen,
  Trash, TrendingUp, Globe, ClipboardList, Loader2, FileText,
  Clock, CheckCircle2, XCircle, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  createForm,
  deleteForm,
  duplicateForm,
  getForms,
  setFormStatus,
} from "@/lib/actions/forms";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "./date-utils";

type FormRow = {
  id: string;
  title: string;
  status: "draft" | "active" | "closed";
  responseCount: number;
  createdAt: Date;
  updatedAt: Date;
  slug: string;
  accentColor: string;
};

const STATUS_CONFIG = {
  active: { label: "Active", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10 border-emerald-200" },
  draft: { label: "Draft", icon: FileText, className: "text-blue-600 bg-blue-500/10 border-blue-200" },
  closed: { label: "Closed", icon: XCircle, className: "text-muted-foreground bg-muted border-border" },
};

function FormCard({ form, onDelete, onDuplicate }: {
  form: FormRow;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const status = STATUS_CONFIG[form.status];
  const StatusIcon = status.icon;

  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm transition-all">
      {/* Color dot */}
      <div
        className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm"
        style={{ backgroundColor: `${form.accentColor}20`, border: `1.5px solid ${form.accentColor}40` }}
      >
        <SquarePen className="h-4 w-4" style={{ color: form.accentColor }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/forms/${form.id}/edit`}
            className="font-medium text-sm text-foreground hover:underline truncate"
          >
            {form.title}
          </Link>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <div className={cn("flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full border", status.className)}>
            <StatusIcon className="h-2.5 w-2.5" />
            {status.label}
          </div>
          <span className="text-xs text-muted-foreground">
            {form.responseCount} {form.responseCount === 1 ? "response" : "responses"}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Updated {formatDistanceToNow(new Date(form.updatedAt))}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 hidden sm:flex">
          <Link href={`/forms/${form.id}/results`}>
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Results
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/f/${form.slug}`} target="_blank" title="Open public form">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/forms/${form.id}/edit`}>
              <SquarePen className="h-4 w-4 mr-2" />
              Edit Form
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/forms/${form.id}/results`}>
              <ClipboardList className="h-4 w-4 mr-2" />
              View Results
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/forms/${form.id}/analytics`}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/forms/${form.id}/settings`}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/f/${form.slug}`} target="_blank">
              <Globe className="h-4 w-4 mr-2" />
              Open Public Link
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(form.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={() => onDelete(form.id)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FormsListClient({ initialForms }: { initialForms: FormRow[] }) {
  const router = useRouter();
  const [forms, setForms] = useState<FormRow[]>(initialForms);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "closed">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = forms.filter((f) => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const result = await createForm({ title: newTitle.trim() });
    if (result.success && result.data) {
      setCreateOpen(false);
      setNewTitle("");
      router.push(`/forms/${result.data.id}/edit`);
    } else {
      toast.error(result.error ?? "Failed to create form");
    }
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      const result = await deleteForm(id);
      if (result.success) {
        setForms((f) => f.filter((x) => x.id !== id));
        toast.success("Form deleted");
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
    setDeleteId(null);
  };

  const handleDuplicate = async (id: string) => {
    const result = await duplicateForm(id);
    if (result.success && result.data) {
      router.push(`/forms/${result.data.id}/edit`);
      toast.success("Form duplicated!");
    } else {
      toast.error(result.error ?? "Failed to duplicate");
    }
  };

  return (
    <>
      <div className="flex-1 p-4 pt-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Forms</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {forms.length} form{forms.length !== 1 ? "s" : ""} in your workspace
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            New Form
          </Button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forms..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "active", "draft", "closed"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-foreground">
              {search || statusFilter !== "all" ? "No forms match your filters" : "No forms yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first form to get started"}
            </p>
            {!search && statusFilter === "all" && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus data-icon="inline-start" />
                Create Form
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onDelete={setDeleteId}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
            <DialogDescription>Give your form a name to get started.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="form-title">Form Title</Label>
            <Input
              id="form-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Customer Feedback Survey"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>
              Create & Open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the form and all its responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
