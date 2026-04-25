"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTransition, useState } from "react";
import { 
  AdminOrganizationDetail, 
  adminUpdateOrganization, 
  adminDeleteOrganization,
  adminUpdateOrganizationMember,
  adminRemoveOrganizationMember,
  adminDeleteForm,
  adminDeleteAsset
} from "@/lib/actions/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  Save, 
  Building2, 
  Users, 
  FileText, 
  Trash2, 
  ExternalLink,
  Shield,
  User,
  Settings,
  AlertTriangle,
  ArrowRight,
  MoreVertical,
  Check,
  X,
  HardDrive,
  ImageIcon,
  FileIcon,
  VideoIcon,
  MusicIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitize } from "@/lib/sanitize";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const orgSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
});

export function OrganizationEditClient({ 
  organization 
}: { 
  organization: AdminOrganizationDetail 
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFormDeleteDialogOpen, setIsFormDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [isDeletingForm, setIsDeletingForm] = useState(false);
  const [isAssetDeleteDialogOpen, setIsAssetDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);

  const handleAssetDelete = async () => {
    if (!assetToDelete) return;
    setIsDeletingAsset(true);
    try {
      const result = await adminDeleteAsset(assetToDelete);
      if (result.success) {
        toast.success("Asset deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete asset");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsDeletingAsset(false);
      setIsAssetDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  };

  const handleFormDelete = async () => {
    if (!formToDelete) return;
    setIsDeletingForm(true);
    try {
      const result = await adminDeleteForm(formToDelete);
      if (result.success) {
        toast.success("Form deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete form");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsDeletingForm(false);
      setIsFormDeleteDialogOpen(false);
      setFormToDelete(null);
    }
  };

  const form = useForm<z.infer<typeof orgSchema>>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: organization.name,
      description: organization.description,
    },
  });

  const onSubmit = async (values: z.infer<typeof orgSchema>) => {
    startTransition(async () => {
      const result = await adminUpdateOrganization(organization.id, values);
      if (result.success) {
        toast.success("Organization updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update organization");
      }
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await adminDeleteOrganization(organization.id);
      if (result.success) {
        toast.success("Organization deleted successfully");
        router.push("/admin/organizations");
      } else {
        toast.error(result.error || "Failed to delete organization");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: "owner" | "administrator" | "manager" | "editor" | "viewer") => {
    const result = await adminUpdateOrganizationMember(memberId, role);
    if (result.success) {
      toast.success("Member role updated");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const result = await adminRemoveOrganizationMember(memberId);
    if (result.success) {
      toast.success("Member removed");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to remove member");
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-muted/50 p-1 border border-border/50 mb-4">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 min-w-[1.25rem] text-[10px]">
              {organization.memberCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FileText className="h-4 w-4" />
            Forms
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 min-w-[1.25rem] text-[10px]">
              {organization.formCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Assets
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 min-w-[1.25rem] text-[10px]">
              {organization.assets?.length ?? 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 focus-visible:outline-none">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-border shadow-sm">
                  <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Organization Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <Avatar className="h-20 w-20 rounded-xl border-2 border-border/50 shadow-md shrink-0">
                        <AvatarImage src={organization.avatarUrl || ""} />
                        <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
                          {organization.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-4 w-full">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization Name</Label>
                          <Input id="name" {...form.register("name")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                          <Textarea 
                            id="description" 
                            {...form.register("description")} 
                            placeholder="A brief description of the organization..."
                            className="min-h-[100px] resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm border-destructive/20 bg-destructive/5">
                  <CardHeader className="py-4 border-b border-destructive/10 bg-destructive/5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">Delete Organization</p>
                        <p className="text-xs text-muted-foreground">
                          This will permanently delete the organization and all its data.
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-border shadow-sm">
                  <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Stats Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-xs text-muted-foreground">Total Members</span>
                      <span className="text-sm font-bold">{organization.memberCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-xs text-muted-foreground">Total Forms</span>
                      <span className="text-sm font-bold">{organization.formCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-xs text-muted-foreground">Created On</span>
                      <span className="text-sm font-medium">
                        {new Date(organization.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Button asChild variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/5 text-primary">
                  <Link href={`/organizations/${organization.id}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                    Visit Organization Page
                    <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] shadow-md">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="members" className="focus-visible:outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Organization Members
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.members.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/10 border-border/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-lg border border-border/50 shadow-sm">
                          <AvatarImage src={member.user.avatarUrl || ""} />
                          <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                            {member.user.name?.[0] || member.user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate leading-tight">
                            {member.user.name || "Unknown User"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate opacity-70">
                            {member.user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[10px] py-0",
                        member.role === "owner" ? "bg-amber-500/5 text-amber-600 border-amber-500/20" :
                        member.role === "manager" ? "bg-red-500/5 text-red-600 border-red-500/20" :
                        member.role === "administrator" ? "bg-blue-500/5 text-blue-600 border-blue-500/20" :
                        member.role === "editor" ? "bg-green-500/5 text-green-600 border-green-500/20" :
                        "bg-muted text-muted-foreground border-border"
                      )}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs font-medium opacity-50 uppercase tracking-wider">Change Role</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "owner")}>
                            Set as Owner
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "manager")}>
                            Set as Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "administrator")}>
                            Set as Administrator
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "editor")}>
                            Set as Editor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "viewer")}>
                            Set as Viewer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Remove from Org
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="focus-visible:outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Organization Forms
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead>Form</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.forms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                      This organization hasn't created any forms yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  organization.forms.map((form) => (
                    <TableRow key={form.id} className="hover:bg-muted/10 border-border/40">
                      <TableCell>
                        <span
                          className="text-sm font-medium prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: sanitize(form.title) }}
                        />
                      </TableCell>
                      <TableCell>
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/50">
                          {form.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] py-0 font-mono">
                          {form.responsesCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(form.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                            <Link href={`/f/${form.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              setFormToDelete(form.id);
                              setIsFormDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Assets Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="assets" className="focus-visible:outline-none space-y-4">
          <AssetsTabContent
            assets={organization.assets ?? []}
            storage={organization.storage ?? { totalBytes: 0, totalFiles: 0, assetBytes: 0, assetFiles: 0, formBytes: 0, formFiles: 0, limitBytes: 100 * 1024 * 1024 }}
            onDelete={(id) => {
              setAssetToDelete(id);
              setIsAssetDeleteDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Organization?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{organization.name}</strong> and all its associated data. 
              This action cannot be undone and will affect all {organization.memberCount} members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isFormDeleteDialogOpen} onOpenChange={setIsFormDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Form?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this form and all its responses. 
              Associated files and collaborative sessions will also be purged.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingForm}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleFormDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingForm}
            >
              {isDeletingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAssetDeleteDialogOpen} onOpenChange={setIsAssetDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Asset?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this asset from storage. 
              Any forms using this asset will show a broken link.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAsset}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleAssetDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingAsset}
            >
              {isDeletingAsset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Shared Assets Tab ────────────────────────────────────────────────────────

type AssetEntry = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: string;
  url: string;
  storagePath: string;
  createdAt: Date;
};

type StorageStats = {
  totalBytes: number;
  totalFiles: number;
  assetBytes: number;
  assetFiles: number;
  formBytes: number;
  formFiles: number;
  limitBytes: number;
};

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function AssetTypeIcon({ type, mimeType }: { type: string; mimeType: string }) {
  if (type === "image") return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (type === "video") return <VideoIcon className="h-4 w-4 text-violet-500" />;
  if (type === "audio") return <MusicIcon className="h-4 w-4 text-pink-500" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

function StorageBar({ assetBytes, formBytes, total }: { assetBytes: number; formBytes: number; total: number }) {
  const totalUsed = assetBytes + formBytes;
  const pctAsset = Math.min((assetBytes / total) * 100, 100);
  const pctForm = Math.min((formBytes / total) * 100, 100 - pctAsset);
  const pctTotal = Math.min((totalUsed / total) * 100, 100);
  const isDanger = pctTotal > 90;
  const isWarning = pctTotal > 70 && !isDanger;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"}`} />
            <span>Assets: {fmtBytes(assetBytes)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <span>Forms: {fmtBytes(formBytes)}</span>
          </div>
        </div>
        <span>{fmtBytes(totalUsed)} / {fmtBytes(total)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
        <div
          className={`h-full transition-all ${isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${pctAsset}%` }}
          title={`Assets: ${fmtBytes(assetBytes)}`}
        />
        <div
          className="h-full bg-muted-foreground/40 transition-all border-l border-background/20"
          style={{ width: `${pctForm}%` }}
          title={`Form Uploads: ${fmtBytes(formBytes)}`}
        />
      </div>
    </div>
  );
}

export function AssetsTabContent({ 
  assets, 
  storage,
  onDelete
}: { 
  assets: AssetEntry[]; 
  storage: StorageStats;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Storage Usage Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Segmented bar */}
          <StorageBar assetBytes={storage.assetBytes} formBytes={storage.formBytes} total={storage.limitBytes} />

          {/* Breakdown tiles */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assets</p>
              <p className="text-base font-bold tabular-nums">{fmtBytes(storage.assetBytes)}</p>
              <p className="text-[10px] text-muted-foreground">{storage.assetFiles} file{storage.assetFiles !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Form Uploads</p>
              <p className="text-base font-bold tabular-nums">{fmtBytes(storage.formBytes)}</p>
              <p className="text-[10px] text-muted-foreground">{storage.formFiles} file{storage.formFiles !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Limit</p>
              <p className="text-base font-bold tabular-nums">{fmtBytes(storage.limitBytes)}</p>
              <p className="text-[10px] text-muted-foreground">5 MB per file</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-primary" />
            Asset Library
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                  No assets uploaded yet.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((a) => (
                <TableRow key={a.id} className="hover:bg-muted/10 border-border/40">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {a.type === "image" && a.url ? (
                        <div className="h-8 w-8 rounded border border-border/50 overflow-hidden shrink-0 bg-muted">
                          <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded border border-border/50 bg-muted/50 flex items-center justify-center shrink-0">
                          <AssetTypeIcon type={a.type} mimeType={a.mimeType} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[200px]">{a.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{a.originalName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] py-0 capitalize">
                      {a.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {fmtBytes(a.size)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </TableCell>
                   <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!a.storagePath.startsWith("forms/") && (
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link href={a.url} target="_blank">
                            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Link>
                        </Button>
                      )}
                      {onDelete && !a.storagePath.startsWith("forms/") && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDelete(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
