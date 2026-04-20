"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload, Trash2, Copy, Search, Image, FileText, Film,
  Music, File, LayoutGrid, List, HardDrive, X, Check,
  ChevronDown, Eye, Download, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadAsset, deleteAsset, renameAsset } from "@/lib/actions/assets";
import type { Asset } from "@/db/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STORAGE_LIMIT = 500 * 1024 * 1024; // 500 MB per workspace (display only)

const TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Film,
  document: FileText,
  audio: Music,
  other: File,
};

const TYPE_LABELS: Record<string, string> = {
  image: "Images",
  video: "Videos",
  document: "Documents",
  audio: "Audio",
  other: "Other",
};

const ACCEPTED_TYPES = [
  "image/*", "video/*", "audio/*",
  "application/pdf", "text/plain", "text/csv",
  ".doc", ".docx", ".xls", ".xlsx",
].join(",");

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssetIcon({ type, url, name }: { type: string; url: string; name: string }) {
  if (type === "image") {
    return (
      <img
        src={url}
        alt={name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
        }}
      />
    );
  }
  const Icon = TYPE_ICONS[type] ?? File;
  return (
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <Icon className="w-10 h-10" />
    </div>
  );
}

function StorageBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min((used / total) * 100, 100);
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(total)} limit</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type UsageData = {
  totalBytes: number;
  totalFiles: number;
  byType: Record<string, { bytes: number; count: number }>;
};

interface Props {
  workspaceId: string;
  initialAssets: Asset[];
  usage: UsageData;
}

export function AssetsClient({ workspaceId, initialAssets, usage }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Local state
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Preview dialog
  const [preview, setPreview] = useState<Asset | null>(null);

  // Delete confirm
  const [toDelete, setToDelete] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename dialog
  const [toRename, setToRename] = useState<Asset | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = assets.filter((a) => {
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.originalName.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  // ─── Upload handler ─────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      setUploading(true);
      let successCount = 0;

      for (const file of fileArr) {
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadAsset(workspaceId, fd);
        if (result.success && result.data) {
          setAssets((prev) => [result.data as Asset, ...prev]);
          successCount++;
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.error}`);
        }
      }

      setUploading(false);
      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "File uploaded successfully"
            : `${successCount} files uploaded`
        );
        router.refresh();
      }
    },
    [workspaceId, router]
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleUpload(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
  };

  // ─── Copy URL ───────────────────────────────────────────────────────────────

  const copyUrl = async (asset: Asset) => {
    await navigator.clipboard.writeText(asset.url);
    setCopied(asset.id);
    setTimeout(() => setCopied(null), 2000);
    toast.success("URL copied to clipboard");
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const result = await deleteAsset(toDelete.id);
    setDeleting(false);
    if (result.success) {
      setAssets((prev) => prev.filter((a) => a.id !== toDelete.id));
      toast.success("Asset deleted");
      setToDelete(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  };

  // ─── Rename ─────────────────────────────────────────────────────────────────

  const handleRename = async () => {
    if (!toRename || !newName.trim()) return;
    setRenaming(true);
    const result = await renameAsset(toRename.id, newName.trim());
    setRenaming(false);
    if (result.success && result.data) {
      setAssets((prev) =>
        prev.map((a) => (a.id === toRename.id ? (result.data as Asset) : a))
      );
      toast.success("Asset renamed");
      setToRename(null);
    } else {
      toast.error(result.error ?? "Failed to rename");
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Assets</h1>
              <p className="text-sm text-muted-foreground">
                {usage.totalFiles} file{usage.totalFiles !== 1 ? "s" : ""} &bull;{" "}
                {formatBytes(usage.totalBytes)} used
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2 shrink-0"
            >
              {uploading ? (
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={onFileInput}
            />
          </div>

          {/* Storage bar */}
          <StorageBar used={usage.totalBytes} total={STORAGE_LIMIT} />

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search assets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {["all", "image", "video", "document", "audio", "other"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    typeFilter === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "All" : TYPE_LABELS[t]}
                  {t !== "all" && usage.byType[t]
                    ? ` (${usage.byType[t].count})`
                    : ""}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1 border border-border rounded-md p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Drop zone + content ────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Drag overlay */}
          {dragOver && (
            <div className="fixed inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
                <p className="text-lg font-semibold text-primary">Drop files to upload</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <HardDrive className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {search || typeFilter !== "all" ? "No assets found" : "No assets yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                {search || typeFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Upload images, videos, documents, and more to use across your workspace."}
              </p>
              {!search && typeFilter === "all" && (
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload your first asset
                </Button>
              )}
            </div>
          )}

          {/* Grid view */}
          {filtered.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((asset) => (
                <AssetGridCard
                  key={asset.id}
                  asset={asset}
                  copied={copied}
                  onPreview={() => setPreview(asset)}
                  onCopy={() => copyUrl(asset)}
                  onRename={() => { setToRename(asset); setNewName(asset.name); }}
                  onDelete={() => setToDelete(asset)}
                />
              ))}
            </div>
          )}

          {/* List view */}
          {filtered.length > 0 && viewMode === "list" && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Name</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">Type</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Size</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5 hidden lg:table-cell">Uploaded</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asset, i) => (
                    <AssetListRow
                      key={asset.id}
                      asset={asset}
                      isLast={i === filtered.length - 1}
                      copied={copied}
                      onPreview={() => setPreview(asset)}
                      onCopy={() => copyUrl(asset)}
                      onRename={() => { setToRename(asset); setNewName(asset.name); }}
                      onDelete={() => setToDelete(asset)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Preview Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.name}</DialogTitle>
            <DialogDescription className="flex items-center gap-3 text-xs">
              <span>{preview && formatBytes(preview.size)}</span>
              <span>&bull;</span>
              <span>{preview?.mimeType}</span>
              <span>&bull;</span>
              <span>{preview && formatDate(preview.createdAt)}</span>
            </DialogDescription>
          </DialogHeader>

          {preview?.type === "image" && (
            <div className="rounded-lg overflow-hidden bg-muted max-h-[60vh] flex items-center justify-center">
              <img src={preview.url} alt={preview.name} className="max-h-[60vh] max-w-full object-contain" />
            </div>
          )}
          {preview?.type === "video" && (
            <video src={preview.url} controls className="w-full rounded-lg max-h-[60vh]" />
          )}
          {preview?.type === "audio" && (
            <audio src={preview.url} controls className="w-full" />
          )}
          {(preview?.type === "document" || preview?.type === "other") && (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-3">
              {(() => { const Icon = TYPE_ICONS[preview?.type ?? "other"] ?? File; return <Icon className="h-16 w-16" />; })()}
              <p className="text-sm">Preview not available for this file type</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" className="gap-2" onClick={() => preview && copyUrl(preview)}>
              {copied === preview?.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy URL
            </Button>
            <Button asChild className="gap-2">
              <a href={preview?.url} download={preview?.originalName} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Download
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete asset?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{toDelete?.name}</span> will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Rename Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!toRename} onOpenChange={(open) => !open && setToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename asset</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Asset name"
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setToRename(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={renaming || !newName.trim()}>
              {renaming ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Asset Grid Card ──────────────────────────────────────────────────────────

interface CardProps {
  asset: Asset;
  copied: string | null;
  onPreview: () => void;
  onCopy: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function AssetGridCard({ asset, copied, onPreview, onCopy, onRename, onDelete }: CardProps) {
  return (
    <div className="group relative rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all">
      {/* Thumbnail */}
      <button
        onClick={onPreview}
        className="w-full aspect-square flex items-center justify-center bg-muted overflow-hidden"
      >
        <AssetIcon type={asset.type} url={asset.url} name={asset.name} />
      </button>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
        <button onClick={onPreview} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
          <Eye className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Footer */}
      <div className="p-2">
        <p className="text-xs font-medium truncate" title={asset.name}>{asset.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{formatBytes(asset.size)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent transition-colors">
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onPreview} className="gap-2">
                <Eye className="h-4 w-4" /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopy} className="gap-2">
                {copied === asset.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename} className="gap-2">
                <Pencil className="h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ─── Asset List Row ───────────────────────────────────────────────────────────

interface RowProps extends CardProps {
  isLast: boolean;
}

function AssetListRow({ asset, isLast, copied, onPreview, onCopy, onRename, onDelete }: RowProps) {
  const Icon = TYPE_ICONS[asset.type] ?? File;
  return (
    <tr className={`hover:bg-muted/40 transition-colors ${!isLast ? "border-b border-border" : ""}`}>
      <td className="px-4 py-3">
        <button onClick={onPreview} className="flex items-center gap-3 group">
          <div className="h-8 w-8 rounded bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {asset.type === "image" ? (
              <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <span className="font-medium text-sm group-hover:text-primary transition-colors truncate max-w-[180px]">
            {asset.name}
          </span>
        </button>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <Badge variant="secondary" className="text-xs capitalize">{asset.type}</Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
        {formatBytes(asset.size)}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
        {formatDate(asset.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onCopy} title="Copy URL" className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            {copied === asset.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <button onClick={onRename} title="Rename" className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} title="Delete" className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
