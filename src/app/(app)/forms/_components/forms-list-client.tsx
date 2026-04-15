"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Copy, MoreHorizontal, Plus, Search, Settings, SquarePen,
  Trash, TrendingUp, Globe, ClipboardList, Loader2, FileText,
  CheckCircle2, XCircle, ExternalLink, MoveRight, Building2, Lock
} from "lucide-react";
import Link from "next/link";
import {
  createForm,
  deleteForm,
  duplicateForm,
  moveForms,
  deleteForms,
} from "@/lib/actions/forms";
import { getActiveSessions } from "@/lib/actions/collaboration";
import { createClient } from "@/lib/client";
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
  collaborationEnabled: boolean;
};

type ActiveUser = {
  userId: string;
  name: string;
  color: string;
  presenceKey: string;
};

type WorkspaceRow = {
  id: string;
  name: string;
  type: string;
};

const STATUS_CONFIG = {
  active: { label: "Active", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10 border-emerald-200" },
  draft: { label: "Draft", icon: FileText, className: "text-blue-600 bg-blue-500/10 border-blue-200" },
  closed: { label: "Closed", icon: XCircle, className: "text-muted-foreground bg-muted border-border" },
};

function FormCard({ 
  form, 
  isSelected, 
  activeUsers = [],
  onToggleSelect, 
  onDelete, 
  onDuplicate,
  onNavigate,
  isPending,
  pendingAction,
  pendingFormId
}: {
  form: FormRow;
  isSelected: boolean;
  activeUsers?: ActiveUser[];
  onToggleSelect: (id: string, selected: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onNavigate: (id: string, action: string, href: string) => void;
  isPending: boolean;
  pendingAction: string | null;
  pendingFormId: string | null;
}) {
  const status = STATUS_CONFIG[form.status];
  const StatusIcon = status.icon;
  const isLocked = !form.collaborationEnabled && activeUsers.length > 0;

  const isThisFormPending = isPending && pendingFormId === form.id;
  const isEntering = isThisFormPending && pendingAction === "enter";
  const isDuplicating = isThisFormPending && pendingAction === "duplicate";
  const isDeleting = isThisFormPending && pendingAction === "delete";
  const anyCriticalAction = isDuplicating || isDeleting;

  const renderActionIcon = (action: string, DefaultIcon: any) => {
    if (isThisFormPending && pendingAction === action) {
      return <Loader2 className="h-4 w-4 mr-2 animate-spin" />;
    }
    return <DefaultIcon className="h-4 w-4 mr-2" />;
  };

  return (
    <div className={cn(
      "group flex items-center gap-4 p-4 rounded-xl border transition-all",
      isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm"
    )}>
      <div className="flex items-center space-x-2 shrink-0 pr-2">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={(checked) => onToggleSelect(form.id, checked as boolean)}
          disabled={isLocked}
        />
      </div>

      <div
        className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm"
        style={{ backgroundColor: `${form.accentColor}20`, border: `1.5px solid ${form.accentColor}40` }}
      >
        {isEntering ? (
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: form.accentColor }} />
        ) : (
          <SquarePen className="h-4 w-4" style={{ color: form.accentColor }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={isLocked ? `/forms/${form.id}/results` : `/forms/${form.id}/edit`}
            className="font-medium text-sm text-foreground hover:underline truncate flex items-center gap-2"
            onClick={(e) => {
              if (isLocked) return;
              e.preventDefault();
              onNavigate(form.id, "enter", `/forms/${form.id}/edit`);
            }}
          >
            {form.title}
          </Link>
          {isLocked && (
            <Badge variant="outline" className="h-5 px-1.5 gap-1 text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </Badge>
          )}
          {!isLocked && activeUsers.length > 0 && form.collaborationEnabled && (
            <Badge variant="outline" className="h-5 px-1.5 gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <div className={cn("flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full border", status.className)}>
            <StatusIcon className="h-2.5 w-2.5" />
            {status.label}
          </div>
          <span className="text-xs text-muted-foreground">
             {form.responseCount} {form.responseCount === 1 ? "response" : "responses"}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block" suppressHydrationWarning>
            Updated {formatDistanceToNow(new Date(form.updatedAt))}
          </span>
        </div>
      </div>

      {activeUsers.length > 0 && (
        <div className="flex items-center -space-x-1.5 mr-2">
          {activeUsers.slice(0, 3).map((user) => (
            <div
              key={user.presenceKey}
              className="h-6 w-6 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {activeUsers.length > 3 && (
            <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
              +{activeUsers.length - 3}
            </div>
          )}
        </div>
      )}


      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem 
            asChild 
            disabled={isLocked || anyCriticalAction}
            onSelect={(e) => {
              e.preventDefault();
              onNavigate(form.id, "edit", `/forms/${form.id}/edit`);
            }}
          >
            <Link href={`/forms/${form.id}/edit`} prefetch={false}>
              {renderActionIcon("edit", SquarePen)}
              Edit Form
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            asChild
            disabled={anyCriticalAction}
            onSelect={(e) => {
              e.preventDefault();
              onNavigate(form.id, "results", `/forms/${form.id}/results`);
            }}
          >
            <Link href={`/forms/${form.id}/results`} prefetch={false}>
              {renderActionIcon("results", ClipboardList)}
              View Results
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            asChild
            disabled={anyCriticalAction}
            onSelect={(e) => {
              e.preventDefault();
              onNavigate(form.id, "analytics", `/forms/${form.id}/analytics`);
            }}
          >
            <Link href={`/forms/${form.id}/analytics`} prefetch={false}>
              {renderActionIcon("analytics", TrendingUp)}
              Analytics
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            asChild
            disabled={anyCriticalAction}
            onSelect={(e) => {
              e.preventDefault();
              onNavigate(form.id, "settings", `/forms/${form.id}/settings`);
            }}
          >
            <Link href={`/forms/${form.id}/settings`} prefetch={false}>
              {renderActionIcon("settings", Settings)}
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            asChild
            disabled={anyCriticalAction}
            onSelect={(e) => {
              e.preventDefault();
              window.open(`/f/${form.slug}`, "_blank");
            }}
          >
            <Link href={`/f/${form.slug}`} target="_blank">
              <Globe className="h-4 w-4 mr-2" />
              Open Public Link
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            disabled={anyCriticalAction}
            onSelect={(e) => {
              e.preventDefault();
              onDuplicate(form.id);
            }}
          >
            {renderActionIcon("duplicate", Copy)}
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            disabled={anyCriticalAction}
            onSelect={(e) => {
              e.preventDefault();
              onDelete(form.id);
            }}
          >
            {renderActionIcon("delete", Trash)}
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function useDashboardRealtime(onFormUpdate: (id: string, changes: Partial<FormRow>) => void) {
  const [sessions, setSessions] = useState<Record<string, ActiveUser[]>>({});

  const refreshSessions = useCallback(async () => {
    const res = await getActiveSessions();
    if (res.success && res.data) {
      const map: Record<string, ActiveUser[]> = {};
      res.data.forEach(s => {
        if (!map[s.formId]) map[s.formId] = [];
        map[s.formId].push({
          userId: s.userId,
          name: s.name,
          color: s.color,
          presenceKey: s.presenceKey
        });
      });
      setSessions(map);
    }
  }, []);

  useEffect(() => {
    refreshSessions();

    const supabase = createClient();
    
    // 1. Listen for session changes (locked/active state)
    const sessionChannel = supabase
      .channel("dashboard_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_form_sessions" },
        () => refreshSessions()
      )
      .subscribe();

    // 2. Listen for form metadata changes (title, status, etc.)
    const formChannel = supabase
      .channel("dashboard_forms")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "forms" },
        (payload: any) => {
          const newDoc = payload.new as Record<string, any>;
          const changes: Partial<FormRow> = {};
          if ("title" in newDoc) changes.title = newDoc.title;
          if ("status" in newDoc) changes.status = newDoc.status;
          if ("slug" in newDoc) changes.slug = newDoc.slug;
          if ("accent_color" in newDoc) changes.accentColor = newDoc.accent_color;
          if ("collaboration_enabled" in newDoc) changes.collaborationEnabled = newDoc.collaboration_enabled;
          
          onFormUpdate(newDoc.id, changes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(formChannel);
    };
  }, [refreshSessions, onFormUpdate]);

  return sessions;
}

export function FormsListClient({ 
  initialForms, 
  targetWorkspaces 
}: { 
  initialForms: FormRow[], 
  targetWorkspaces: WorkspaceRow[] 
}) {
  const router = useRouter();
  const [forms, setForms] = useState<FormRow[]>(initialForms);

  const handleRemoteFormUpdate = useCallback((id: string, changes: Partial<FormRow>) => {
    setForms(prev => prev.map(f => f.id === id ? { ...f, ...changes } : f));
  }, []);

  const activeSessionsMap = useDashboardRealtime(handleRemoteFormUpdate);

  useEffect(() => {
    setForms(initialForms);
  }, [initialForms]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "closed">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [multiDeleteOpen, setMultiDeleteOpen] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingFormId, setPendingFormId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setPendingFormId(null);
    setPendingAction(null);
  }, [router, forms]);

  const filtered = forms.filter((f) => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedForms = forms.filter(f => selectedIds.includes(f.id));
  const hasLockedForms = selectedForms.some(f => !f.collaborationEnabled && (activeSessionsMap[f.id]?.length ?? 0) > 0);

  const handleToggleSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(filtered.map(f => f.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleNavigate = (id: string, action: string, href: string) => {
    setPendingFormId(id);
    setPendingAction(action);
    startTransition(() => {
      router.push(href);
    });
  };

  const handleCreate = async (shouldOpen: boolean = true) => {
    if (!newTitle.trim() || isCreating) return;
    setIsCreating(true);
    setPendingAction(shouldOpen ? "create_open" : "create_only");
    
    const result = await createForm({ title: newTitle.trim() });
    if (result.success && result.data) {
      if (shouldOpen) {
        router.push(`/forms/${result.data.id}/edit`);
      } else {
        setCreateOpen(false);
        setNewTitle("");
        router.refresh();
        toast.success("Form created!");
        setIsCreating(false);
        setPendingAction(null);
      }
    } else {
      toast.error(result.error ?? "Failed to create form");
      setIsCreating(false);
      setPendingAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingFormId(id);
    setPendingAction("delete");
    startTransition(async () => {
      const result = await deleteForm(id);
      if (result.success) {
        setForms((f) => f.filter((x) => x.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
        toast.success("Form deleted");
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
      setPendingFormId(null);
      setPendingAction(null);
    });
    setDeleteId(null);
  };

  const handleDuplicate = async (id: string, shouldOpen: boolean = true) => {
    setPendingFormId(id);
    setPendingAction(shouldOpen ? "duplicate_open" : "duplicate_only");
    startTransition(async () => {
      const result = await duplicateForm(id);
      if (result.success && result.data) {
        if (shouldOpen) {
          router.push(`/forms/${result.data.id}/edit`);
        } else {
          router.refresh();
          toast.success("Form duplicated!");
          setPendingFormId(null);
          setPendingAction(null);
        }
      } else {
        toast.error(result.error ?? "Failed to duplicate");
        setPendingFormId(null);
        setPendingAction(null);
      }
    });
    setDuplicateId(null);
  };

  const handleMoveSelection = async (targetOrganizationId: string) => {
    setIsMoving(true);
    const res = await moveForms(selectedIds, targetOrganizationId);
    setIsMoving(false);
    if (res.success) {
      toast.success(`Successfully moved ${selectedIds.length} form(s)`);
      setForms(f => f.filter(form => !selectedIds.includes(form.id)));
      setSelectedIds([]);
      setMoveOpen(false);
    } else {
      toast.error(res.error || "Failed to move forms");
    }
  };

  const [isDeletingSelection, setIsDeletingSelection] = useState(false);

  const handleDeleteSelection = async () => {
    setIsDeletingSelection(true);
    const count = selectedIds.length;
    const res = await deleteForms(selectedIds);
    setIsDeletingSelection(false);
    
    if (res.success) {
      toast.success(`Successfully deleted ${count} form(s)`);
      setForms(f => f.filter(form => !selectedIds.includes(form.id)));
      setSelectedIds([]);
      setMultiDeleteOpen(false);
    } else {
      toast.error(res.error || "Failed to delete forms");
    }
  };

  return (
    <>
      <div className="flex-1 p-4 pt-6 md:p-8 space-y-6 overflow-y-auto h-full relative">
        {/* Bulk Action Bar (Overlay) */}
        {selectedIds.length > 0 && (
          <div className="absolute top-0 inset-x-0 h-16 bg-primary/5 border-b border-primary/20 flex items-center justify-between px-8 z-10 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
               <Checkbox 
                 checked={selectedIds.length === filtered.length}
                 onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
               />
               <span className="text-sm font-medium">{selectedIds.length} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Cancel
              </Button>
              {hasLockedForms ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-not-allowed">
                        <Button size="sm" disabled className="opacity-50 pointer-events-none">
                          <MoveRight className="h-4 w-4 mr-2" /> Move To...
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cannot move forms that are currently being edited</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button size="sm" onClick={() => setMoveOpen(true)}>
                  <MoveRight className="h-4 w-4 mr-2" /> Move To...
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setMultiDeleteOpen(true)}
              >
                <Trash className="h-4 w-4 mr-2" /> Trash
              </Button>
            </div>
          </div>
        )}

        <div className={cn("transition-all", selectedIds.length > 0 ? "pt-10" : "")}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
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
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
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
                  isSelected={selectedIds.includes(form.id)}
                  activeUsers={activeSessionsMap[form.id]}
                  onToggleSelect={handleToggleSelect}
                  onDelete={setDeleteId}
                  onDuplicate={setDuplicateId}
                  onNavigate={handleNavigate}
                  isPending={isPending}
                  pendingAction={pendingAction}
                  pendingFormId={pendingFormId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Move Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Forms</DialogTitle>
            <DialogDescription>Select a target workspace to move {selectedIds.length} form(s) to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto">
            {targetWorkspaces.map(workspace => (
              <Button 
                key={workspace.id} 
                variant="outline" 
                className="w-full justify-start py-6"
                onClick={() => handleMoveSelection(workspace.id)}
                disabled={isMoving}
              >
                <div className="mr-3 p-2 bg-muted rounded-md flex items-center justify-center">
                  {workspace.type === "personal" ? <SquarePen className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span>{workspace.name}</span>
                  <span className="text-xs text-muted-foreground capitalize font-normal">{workspace.type === "personal" ? "Private Space" : "Organization"}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>Cancel</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleCreate(false)} disabled={!newTitle.trim() || isCreating}>
                {isCreating && pendingAction === "create_only" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create
              </Button>
              <Button onClick={() => handleCreate(true)} disabled={!newTitle.trim() || isCreating}>
                {isCreating && pendingAction === "create_open" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MoveRight className="mr-2 h-4 w-4" />
                )}
                Create & Open
              </Button>
            </div>
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
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Confirm */}
      <AlertDialog open={!!duplicateId} onOpenChange={() => setDuplicateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new form with the same fields and settings as the original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending && (pendingAction === "duplicate_only" || pendingAction === "duplicate_open")}>
              Cancel
            </AlertDialogCancel>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => duplicateId && handleDuplicate(duplicateId, false)}
                disabled={isPending && (pendingAction === "duplicate_only" || pendingAction === "duplicate_open")}
              >
                {isPending && pendingAction === "duplicate_only" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Duplicate
              </Button>
              <Button 
                onClick={() => duplicateId && handleDuplicate(duplicateId, true)}
                disabled={isPending && (pendingAction === "duplicate_only" || pendingAction === "duplicate_open")}
              >
                {isPending && pendingAction === "duplicate_open" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MoveRight className="mr-2 h-4 w-4" />
                )}
                Duplicate & Open
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Bulk Delete Confirm */}
      <AlertDialog open={multiDeleteOpen} onOpenChange={setMultiDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} forms?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected forms and all of their responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSelection}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelection}
              variant="destructive"
              disabled={isDeletingSelection}
            >
              {isDeletingSelection ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash className="mr-2 h-4 w-4" />
              )}
              Delete {selectedIds.length} Forms
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
