"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTransition, useState, useEffect } from "react";
import { adminUpdateUser, adminUpdateUserPassword, adminSignOutUser, type AdminUser } from "@/lib/actions/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { userRoleEnum } from "@/db/schema";
import { 
  Loader2, 
  Save, 
  User, 
  Mail, 
  Shield, 
  Plus, 
  Trash2, 
  Calendar, 
  Upload, 
  Key, 
  Lock, 
  Copy, 
  Check,
  LogOut
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";


const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(userRoleEnum.enumValues),
});

type UserFormValues = z.infer<typeof userSchema>;

export function UserEditClient({ user }: { user: AdminUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(userSchema.extend({
      avatarUrl: z.string().url().nullable().optional().or(z.literal("")),
      emailVerifiedAt: z.string().nullable().optional().or(z.literal("")),
      userMetadata: z.any(),
      appMetadata: z.any(),
    })),
    defaultValues: {
      name: user.name || "",
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl || "",
      emailVerifiedAt: user.emailVerifiedAt 
        ? new Date(user.emailVerifiedAt).toISOString().slice(0, 16) 
        : "",
      userMetadata: user.userMetadata || {},
      appMetadata: user.appMetadata || {},
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      // Convert empty string to null for date
      const payload = {
        ...values,
        emailVerifiedAt: values.emailVerifiedAt ? new Date(values.emailVerifiedAt) : null,
      };
      
      const result = await adminUpdateUser(user.id, payload);
      if (result.success) {
        toast.success("User updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update user");
      }
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const { adminUpdateUserAvatar } = await import("@/lib/actions/admin");
      const result = await adminUpdateUserAvatar(user.id, formData);
      if (result.success) {
        form.setValue("avatarUrl", result.url);
        toast.success("Avatar updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to upload avatar");
      }
    } catch (err) {
      toast.error("An error occurred during upload");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await adminSignOutUser(user.id);
      if (result.success) {
        toast.success("User signed out from all sessions");
      } else {
        toast.error(result.error || "Failed to sign out user");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await adminUpdateUserPassword(user.id, newPassword);
      if (result.success) {
        setIsPasswordDialogOpen(false);
        setIsSuccessDialogOpen(true);
        toast.success("Password updated successfully");
      } else {
        toast.error(result.error || "Failed to update password");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Password copied to clipboard");
  };

  const avatarUrl = form.watch("avatarUrl");
  const coreName = form.watch("name");
  const coreEmail = form.watch("email");
  const coreVerifiedAt = form.watch("emailVerifiedAt");
  const userMetadata = form.watch("userMetadata") || {};

  // Sync Core -> Metadata (Runs on every keystroke/change in core fields)
  useEffect(() => {
    const currentMeta = form.getValues("userMetadata") || {};
    const newMetadata = { ...currentMeta };
    let changed = false;

    // Sync Name (Updates both full_name and name for maximum compatibility)
    if (coreName !== (newMetadata.full_name ?? "")) {
      newMetadata.full_name = coreName;
      changed = true;
    }
    if (coreName !== (newMetadata.name ?? "")) {
      newMetadata.name = coreName;
      changed = true;
    }
    
    // Sync Email
    if (coreEmail !== (newMetadata.email ?? "")) {
      newMetadata.email = coreEmail;
      changed = true;
    }
    
    // Sync Verified Status
    const isVerified = !!coreVerifiedAt;
    if (isVerified !== !!newMetadata.email_verified) {
      newMetadata.email_verified = isVerified;
      newMetadata.email_verified_at = coreVerifiedAt || null;
      changed = true;
    }

    if (changed) {
      // Use silent update to avoid unnecessary re-triggers if possible, 
      // but ensure the view updates.
      form.setValue("userMetadata", newMetadata, { 
        shouldDirty: true,
        shouldValidate: false 
      });
    }
  }, [coreName, coreEmail, coreVerifiedAt]);

  // Sync Metadata -> Core (Runs when metadata keys are edited manually)
  useEffect(() => {
    const metaName = userMetadata.full_name || userMetadata.name || "";
    const metaEmail = userMetadata.email || "";
    const metaVerifiedAt = userMetadata.email_verified_at || "";
    
    if (metaName !== undefined && metaName !== coreName) {
      form.setValue("name", metaName, { shouldDirty: true });
    }
    if (metaEmail !== undefined && metaEmail !== coreEmail) {
      form.setValue("email", metaEmail, { shouldDirty: true });
    }
    // Only sync back if it's a valid string for the datetime-local input
    if (metaVerifiedAt && metaVerifiedAt !== coreVerifiedAt && typeof metaVerifiedAt === "string") {
      form.setValue("emailVerifiedAt", metaVerifiedAt.slice(0, 16), { shouldDirty: true });
    }
  }, [JSON.stringify(userMetadata)]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Core Info */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Core Profile</CardTitle>
                  <CardDescription className="text-xs">
                    Basic account information from the database
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-muted/20 border border-border/50">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-background shadow-xl">
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold bg-primary/5">
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-9 gap-2 shadow-sm"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4" />
                      Change Photo
                    </Button>
                    {avatarUrl && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        className="h-9 text-destructive hover:bg-destructive/5 hover:text-destructive gap-2"
                        onClick={() => form.setValue("avatarUrl", "")}
                        disabled={isUploading}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Recommended: Square image, max 5MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input id="name" {...form.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Role</Label>
                  <Select
                    defaultValue={form.getValues("role")}
                    onValueChange={(value) => form.setValue("role", value as any)}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailVerifiedAt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verified At</Label>
                <Input 
                  id="emailVerifiedAt" 
                  type="datetime-local"
                  {...form.register("emailVerifiedAt")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm opacity-90">
            <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                System Signals
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 p-4">
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Internal ID</p>
                <p className="text-[11px] font-mono truncate text-primary/80">{user.id}</p>
              </div>
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Account Created</p>
                <p className="text-[11px] font-medium"><ClientDate date={user.createdAt} /></p>
              </div>
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Last Activity</p>
                <p className="text-[11px] font-medium">
                  {user.lastSignInAt ? <ClientDate date={user.lastSignInAt} /> : "Never"}
                </p>
              </div>
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Auth Confirmed</p>
                <p className="text-[11px] font-medium">
                  {user.confirmedAt ? <ClientDate date={user.confirmedAt} /> : "Pending"}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm">
            <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-amber-600">Password Reset</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Change this user's password. This action will bypass current password requirements.
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600 shrink-0"
                  onClick={() => {
                    setNewPassword("");
                    setIsPasswordDialogOpen(true);
                  }}
                >
                  <Key className="h-3.5 w-3.5 mr-1.5" />
                  Reset
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-blue-600">Session Management</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Immediately revoke all active sessions and log the user out from all devices.
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600 shrink-0"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Log Out Everywhere
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" />
                Reset User Password
              </DialogTitle>
              <DialogDescription>
                Enter a new password for <strong>{user.email}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type="text"
                    placeholder="Enter new password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setNewPassword(Math.random().toString(36).slice(-10) + "!")}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Minimum 6 characters recommended.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePasswordUpdate} 
                disabled={isChangingPassword || !newPassword}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success / Copy Dialog */}
        <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                Password Changed Successfully
              </DialogTitle>
              <DialogDescription>
                The password for {user.email} has been updated. Please copy it now, as it will not be displayed again.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 px-4 bg-muted/50 rounded-xl border border-border flex items-center justify-between gap-4">
              <code className="text-lg font-mono font-bold tracking-wider text-primary select-all">
                {newPassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10 shrink-0 transition-all",
                  isCopied ? "border-green-500 text-green-500 bg-green-50" : ""
                )}
                onClick={copyToClipboard}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={() => setIsSuccessDialogOpen(false)}>
                I have copied the password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Right Column: Metadata */}
        <div className="space-y-6">
          <MetadataEditor 
            title="User Metadata" 
            description="Dynamic information the user can modify"
            icon={<User className="h-4 w-4 text-blue-500" />}
            iconBg="bg-blue-500/10"
            form={form}
            fieldName="userMetadata"
          />

          <MetadataEditor 
            title="App Metadata" 
            description="Restricted system-level metadata (roles, flags)"
            icon={<Shield className="h-4 w-4 text-violet-500" />}
            iconBg="bg-violet-500/10"
            form={form}
            fieldName="appMetadata"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border sticky bottom-0 bg-background/80 backdrop-blur-sm pb-6">
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
              Update User Account
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function MetadataEditor({ 
  title, 
  description, 
  icon, 
  iconBg, 
  form, 
  fieldName 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  iconBg: string; 
  form: any; 
  fieldName: string;
}) {
  const metadata = form.watch(fieldName) || {};

  const updateKey = (oldKey: string, newKey: string) => {
    const newMetadata = { ...metadata };
    const value = newMetadata[oldKey];
    delete newMetadata[oldKey];
    newMetadata[newKey] = value;
    form.setValue(fieldName, newMetadata);
  };

  const updateValue = (key: string, value: any) => {
    form.setValue(fieldName, { ...metadata, [key]: value });
  };

  const removeKey = (key: string) => {
    const newMetadata = { ...metadata };
    delete newMetadata[key];
    form.setValue(fieldName, newMetadata);
  };

  const addKey = () => {
    form.setValue(fieldName, { ...metadata, ["new_key"]: "" });
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addKey}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {Object.entries(metadata).filter(([key]) => !key.toLowerCase().includes("phone")).length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground italic">
              No metadata found in this category.
            </div>
          ) : (
            Object.entries(metadata)
              .filter(([key]) => !key.toLowerCase().includes("phone"))
              .map(([key, value]) => (
              <div key={key} className="p-4 flex items-start gap-4 group">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input 
                      className="h-8 text-xs font-mono bg-muted/30 border-transparent focus:border-border transition-colors w-1/3"
                      value={key}
                      onChange={(e) => updateKey(key, e.target.value)}
                      placeholder="Key"
                    />
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <Input 
                    className="h-9 text-sm"
                    value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    onChange={(e) => updateValue(key, e.target.value)}
                    placeholder="Value"
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeKey(key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ClientDate({ date }: { date: Date | string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <span className="opacity-0">Loading...</span>;

  return <span>{new Date(date).toLocaleString()}</span>;
}
