"use client";

import { useTransition, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Camera, Monitor, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import { 
  updateProfileAction, 
  updatePasswordAction, 
  signOutOthersAction, 
  resetPasswordFromSettingsAction, 
  deleteAccountAction,
  uploadAvatarAction,
  removeAvatarAction
} from "./actions";
import type { UserIdentity } from "@supabase/supabase-js";

export function SettingsClient({ 
  user, 
  identities,
  hasPassword
}: { 
  user: { id: string, name: string | null, email: string, avatarUrl: string | null },
  identities: UserIdentity[],
  hasPassword: boolean
}) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [signOutOthersOpen, setSignOutOthersOpen] = useState(false);
  const [emailChangeAlertOpen, setEmailChangeAlertOpen] = useState(false);
  const [avatarRemoveOpen, setAvatarRemoveOpen] = useState(false);


  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newEmail = formData.get('email') as string;
    
    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Profile updated successfully.');
        if (res?.emailChangePending) {
          window.location.href = `/settings/verify-email-change?oldEmail=${encodeURIComponent(user.email)}&newEmail=${encodeURIComponent(res.newEmail || newEmail)}`;
        }
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updatePasswordAction(formData);
      if (res?.error) toast.error(res.error);
      else toast.success('Password updated. You may be logged out.');
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB.');
        e.target.value = '';
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      // Reset input value so the same file can be selected again
      e.target.value = '';
      
      startTransition(async () => {
        const res = await uploadAvatarAction(formData);
        if (res?.error) toast.error(res.error);
        else toast.success('Avatar uploaded successfully.');
      });
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarRemoveOpen(false);
    startTransition(async () => {
      const res = await removeAvatarAction();
      if (res?.error) toast.error(res.error);
      else toast.success('Avatar removed.');
    });
  };

  const handleSignoutOthers = () => {
    setSignOutOthersOpen(false);
    startTransition(async () => {
      const res = await signOutOthersAction();
      if (res?.error) toast.error(res.error);
      else toast.success('Successfully signed out from other sessions.');
    });
  };



  const handleDeleteAccount = () => {
    setDeleteAccountOpen(false);
    startTransition(async () => {
      const res = await deleteAccountAction();
      if (res?.error) toast.error(res.error);
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 overflow-y-auto h-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      

      <div className="w-full max-w-4xl">
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">Danger</TabsTrigger>
          </TabsList>
          
          <TabsContent value="account">
            <Card>
              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription>
                    Make changes to your account here. Click save when you&apos;re done.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative group/avatar w-fit">
                      <Avatar className="h-24 w-24 border-2 border-border transition-all duration-300 group-hover/avatar:border-primary">
                        <AvatarImage src={user.avatarUrl || undefined} alt="User profile" />
                        <AvatarFallback className="bg-muted text-2xl font-semibold">
                          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
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
                      <h3 className="text-lg font-medium leading-none">Profile Picture</h3>
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
                          Upload image
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setAvatarRemoveOpen(true)}
                          disabled={isPending || !user.avatarUrl}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={user.name || ""} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" defaultValue={user.email} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Save changes"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="password">
            <Card>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newPass = formData.get('new') as string;
                  const confirmPass = formData.get('confirm') as string;
                  
                  if (newPass !== confirmPass) {
                    toast.error("Passwords do not match");
                    return;
                  }
                  
                  handlePasswordSubmit(e);
                }} 
                className="flex flex-col gap-4"
              >
                <CardHeader>
                  <CardTitle>{hasPassword ? "Update Password" : "Create Password"}</CardTitle>
                  <CardDescription>
                    {hasPassword 
                      ? "Change your existing password. After saving, you'll be logged out." 
                      : "Set a password for your account so you can log in without social providers. After saving, you'll be logged out."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasPassword && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="current">Current password</Label>
                        <Button
                          variant="link"
                          type="button"
                          className="px-0 h-auto font-normal text-xs text-muted-foreground hover:text-primary"
                          onClick={() => {
                            startTransition(async () => {
                              const res = await resetPasswordFromSettingsAction();
                              if (res?.error) toast.error(res.error);
                              else toast.success("Reset link sent! Please check your email.");
                            });
                          }}
                        >
                          Forgot your current password?
                        </Button>
                      </div>
                      <PasswordInput id="current" name="current" required placeholder="Enter current password" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="new">{hasPassword ? "New password" : "Password"}</Label>
                    <PasswordInput id="new" name="new" required minLength={6} placeholder="Min. 6 characters" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm">{hasPassword ? "Confirm new password" : "Confirm password"}</Label>
                    <PasswordInput id="confirm" name="confirm" required minLength={6} placeholder="Repeat password" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : hasPassword ? "Update password" : "Create password"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Login Sessions</CardTitle>
                  <CardDescription>
                    Sign out of all other sessions across different devices and browsers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    If you notice suspicious activity, you should sign out of all other sessions and change your password.
                  </p>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 px-6 py-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSignOutOthersOpen(true)}
                    disabled={isPending}
                  >
                    Sign out of all other sessions
                  </Button>
                </CardFooter>
              </Card>


            </div>
          </TabsContent>
          
          <TabsContent value="danger">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </CardContent>
              <CardFooter className="border-t bg-destructive/5 px-6 py-4">
                <Button 
                  variant="destructive"
                  onClick={() => setDeleteAccountOpen(true)}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Delete Account"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Dialogs */}
      <AlertDialog open={avatarRemoveOpen} onOpenChange={setAvatarRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Picture?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your profile picture?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAvatar}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signOutOthersOpen} onOpenChange={setSignOutOthersOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of other sessions?</AlertDialogTitle>
              <AlertDialogDescription>
                This will end all your sessions except for the current one. You will need to log back in on other devices.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignoutOthers}>
                Sign out others
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={emailChangeAlertOpen} onOpenChange={setEmailChangeAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Email Change Requested</AlertDialogTitle>
              <AlertDialogDescription>
                We have sent confirmation links to both your old and new email addresses. Please check both inboxes and click the links to complete the change. Your email will not be updated until both links are clicked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setEmailChangeAlertOpen(false)}>
                Understood
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and all associated data, including your forms and responses.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccount}
                variant="destructive"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
