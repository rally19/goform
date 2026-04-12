"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, Users, Settings, Plus, Loader2, Link as LinkIcon, Trash2, Mail, Camera
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  updateOrganization, 
  deleteOrganization, 
  inviteMember, 
  updateMemberRole, 
  removeMember,
  uploadOrganizationAvatarAction,
  removeOrganizationAvatarAction,
  transferOwnershipAction
} from "@/lib/actions/organizations";

export function OrganizationManageClient({ 
  organization, 
  initialMembers, 
  initialInvites 
}: { 
  organization: any, 
  initialMembers: any[], 
  initialInvites: any[] 
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("members");
  const isOwner = organization.currentUserRole === "owner";
  const isManager = organization.currentUserRole === "manager";
  const isManagerOrAbove = isOwner || isManager;
  const isAdminOrOwner = isOwner || isManager || organization.currentUserRole === "administrator";
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [orgName, setOrgName] = useState(organization.name);
  const [orgDesc, setOrgDesc] = useState(organization.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invite State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager"|"administrator"|"editor"|"viewer">("viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Dialog State
  const [orgDeleteConfirmOpen, setOrgDeleteConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string, name: string } | null>(null);
  const [avatarRemoveConfirmOpen, setAvatarRemoveConfirmOpen] = useState(false);

  // Transfer Ownership State
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const handleUpdateSettings = async () => {
    setIsSaving(true);
    const res = await updateOrganization(organization.id, { 
      name: orgName, 
      description: orgDesc 
    });
    setIsSaving(false);
    if (res.success) {
      toast.success("Settings saved");
    } else {
      toast.error(res.error || "Failed to update settings");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deleteOrganization(organization.id);
    setIsDeleting(false);
    if (res.success) {
      toast.success("Organization deleted");
      router.push("/organizations");
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);
    const res = await inviteMember(organization.id, inviteEmail, inviteRole);
    setIsInviting(false);
    if (res.success && res.data) {
      toast.success("Invite created successfully");
      // For local testing, we immediately expose the token so the user can accept it
      setInviteLink(`${window.location.origin}/api/accept-invite?token=${res.data.token}`);
      setInviteEmail("");
    } else {
      toast.error(res.error || "Failed to create invite");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    toast.promise(updateMemberRole(organization.id, userId, newRole as any), {
      loading: "Updating role...",
      success: "Role updated",
      error: "Failed to update role"
    });
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    const res = await removeMember(organization.id, memberToRemove.id);
    if (res.success) {
      toast.success(memberToRemove.id === organization.currentUserId ? "You have left the organization" : "Member removed");
    } else {
      toast.error(res.error || "Failed to remove member");
    }
    setMemberToRemove(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB.");
        e.target.value = "";
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      e.target.value = "";
      
      startTransition(async () => {
        const res = await uploadOrganizationAvatarAction(organization.id, formData);
        if (res.error) toast.error(res.error);
        else toast.success("Organization avatar updated");
      });
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarRemoveConfirmOpen(false);
    startTransition(async () => {
      const res = await removeOrganizationAvatarAction(organization.id);
      if (res.error) toast.error(res.error);
      else toast.success("Organization avatar removed");
    });
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmail) return;
    setIsTransferring(true);
    const res = await transferOwnershipAction(organization.id, transferEmail);
    setIsTransferring(false);
    if (res.success) {
      toast.success("Ownership transferred successfully");
      setTransferDialogOpen(false);
      setTransferEmail("");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to transfer ownership");
    }
  };

  const roleRanks: Record<string, number> = {
    owner: 5,
    manager: 4,
    administrator: 3,
    editor: 2,
    viewer: 1
  };

  const sortedMembers = useMemo(() => {
    return [...initialMembers].sort((a, b) => {
      // Current user always on top
      if (a.userId === organization.currentUserId) return -1;
      if (b.userId === organization.currentUserId) return 1;
      
      // Sort by role rank
      const rankA = roleRanks[a.role] || 0;
      const rankB = roleRanks[b.role] || 0;
      return rankB - rankA;
    });
  }, [initialMembers, organization.currentUserId]);


  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="h-16 w-16 shrink-0">
          <Avatar className="h-16 w-16 rounded-full border-2 border-border">
            <AvatarImage src={organization.avatarUrl || undefined} alt="Organization Logo" />
            <AvatarFallback className="bg-primary/10 text-primary rounded-full">
              <Building2 className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
          <p className="text-muted-foreground">Manage organization settings and team members.</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1 capitalize">
           Role: {organization.currentUserRole}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4" /> Members</TabsTrigger>
          {isAdminOrOwner && (
            <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {isAdminOrOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Invite New Member</CardTitle>
                <CardDescription>Invite team members to collaborate on forms.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="flex gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label>Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        placeholder="colleague@example.com" 
                        required
                        className="pl-9"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 w-48">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isManagerOrAbove && <SelectItem value="manager">Manager</SelectItem>}
                        <SelectItem value="administrator">Administrator</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={isInviting}>
                    {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Send Invite
                  </Button>
                </form>

                {inviteLink && (
                  <div className="mt-4 p-4 rounded-md bg-muted/50 border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Testing Mode: Invite generated</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Normally an email is sent. For local testing, copy this link in an incognito window:
                      </p>
                      <code className="text-xs bg-muted mt-2 block p-2 rounded truncate max-w-xl">
                        {inviteLink}
                      </code>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                      <LinkIcon className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>People with access to this workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedMembers.map((m) => {
                  const isSelf = m.userId === organization.currentUserId;
                  const isTargetOwner = m.role === "owner";

                  return (
                    <div key={m.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={m.user?.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                            {m.user?.name ? m.user.name.charAt(0).toUpperCase() : (m.user?.email?.charAt(0).toUpperCase() || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {m.user?.name || m.user?.email}
                            {isSelf && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">You</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{m.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isAdminOrOwner && !isTargetOwner ? (
                          <Select defaultValue={m.role} onValueChange={(val) => handleUpdateRole(m.userId, val)}>
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {isManagerOrAbove && <SelectItem value="manager">Manager</SelectItem>}
                              <SelectItem value="administrator">Administrator</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                        )}
                        
                        {(isAdminOrOwner || isSelf) && !isTargetOwner && (
                           <Button 
                             variant="ghost" 
                             size={isSelf ? "default" : "icon"}
                             className={isSelf ? "h-8 text-xs px-3 text-destructive hover:text-destructive hover:bg-destructive/10" : "h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"} 
                             onClick={() => setMemberToRemove({ id: m.userId, name: isSelf ? "your account" : (m.user?.name || m.user?.email || "this member") })}
                           >
                             {isSelf ? "Quit" : <Trash2 className="h-4 w-4" />}
                           </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {initialInvites.length > 0 && isAdminOrOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {initialInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Expires soon</p>
                      </div>
                       <Badge variant="outline" className="capitalize">{inv.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Update your workspace details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center pb-4 border-b">
                <div className="relative group/avatar w-fit">
                  <Avatar className="h-24 w-24 border-2 border-border transition-all duration-300 group-hover/avatar:border-primary">
                    <AvatarImage src={organization.avatarUrl || undefined} alt={organization.name} />
                    <AvatarFallback className="bg-muted text-2xl font-semibold">
                      {organization.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleAvatarUpload} 
                  />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-medium leading-none">Organization Logo</h3>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG or GIF. Max size 2MB.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending}
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                      Upload image
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setAvatarRemoveConfirmOpen(true)}
                      disabled={isPending || !organization.avatarUrl}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input 
                  id="org-name" 
                  value={orgName} 
                  onChange={(e) => setOrgName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-desc">Description</Label>
                <Input 
                  id="org-desc" 
                  value={orgDesc} 
                  onChange={(e) => setOrgDesc(e.target.value)} 
                  placeholder="Optional description..."
                />
              </div>
              <Button onClick={handleUpdateSettings} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-destructive border-opacity-50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions requiring owner privileges.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-md bg-destructive/5 mb-4">
                  <div>
                    <h4 className="font-medium text-sm">Transfer Ownership</h4>
                    <p className="text-xs text-muted-foreground mt-1 text-balance">
                      Promote another member to owner. You will stay in the organization with the Manager role.
                    </p>
                  </div>
                  <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setTransferDialogOpen(true)}>
                    Transfer Ownership
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-md bg-destructive/5">
                  <div>
                    <h4 className="font-medium text-sm">Delete Organization</h4>
                    <p className="text-xs text-muted-foreground mt-1 text-balance">
                      Permanently delete this organization, its forms, and all associated responses data. This cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setOrgDeleteConfirmOpen(true)} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Delete Organization
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
      <AlertDialog open={orgDeleteConfirmOpen} onOpenChange={setOrgDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{organization.name}</strong>, its forms, and all associated response data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{memberToRemove?.id === organization.currentUserId ? "Quit Organization?" : "Remove Member?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.id === organization.currentUserId 
                ? "Are you sure you want to quit this organization? You will lose access to all collaborative forms in this workspace."
                : `Are you sure you want to remove ${memberToRemove?.name} from this organization? They will lose access to all collaborative forms in this workspace.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {memberToRemove?.id === organization.currentUserId ? "Quit Organization" : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={avatarRemoveConfirmOpen} onOpenChange={setAvatarRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Logo?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the organization logo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAvatar}>
              Remove Logo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              Enter the email of the member you want to transfer ownership to. 
              They must already be a member of this organization. 
              <strong> You will stay in the organization as a Manager.</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransferOwnership}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="transfer-email">Member Email</Label>
                <Input 
                  id="transfer-email" 
                  type="email" 
                  placeholder="colleague@example.com" 
                  required
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={isTransferring}>
                {isTransferring && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
