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
import { Camera, Monitor, ShieldCheck, LogOut, Link2 } from "lucide-react";
import { toast } from "sonner";
import { 
  updateProfileAction, 
  updatePasswordAction, 
  signOutOthersAction, 
  disconnectProviderAction, 
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
  const [identityToDisconnect, setIdentityToDisconnect] = useState<UserIdentity | null>(null);


  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (res?.error) toast.error(res.error);
      else toast.success('Profile updated successfully.');
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
      const formData = new FormData();
      formData.append('file', file);
      startTransition(async () => {
        const res = await uploadAvatarAction(formData);
        if (res?.error) toast.error(res.error);
        else toast.success('Avatar uploaded successfully.');
      });
    }
  };

  const handleRemoveAvatar = () => {
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

  const handleDisconnect = (identity: UserIdentity) => {
    setIdentityToDisconnect(null);
    startTransition(async () => {
      const res = await disconnectProviderAction(identity);
      if (res?.error) toast.error(res.error);
      else toast.success('Identity disconnected.');
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
                    <div className="relative group/avatar">
                      <Avatar className="h-24 w-24 border-2 border-border transition-all duration-300 group-hover/avatar:border-primary">
                        <AvatarImage src={user.avatarUrl || ""} alt="User profile" />
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
                          onClick={handleRemoveAvatar}
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
                      <Label htmlFor="current">Current password</Label>
                      <Input id="current" name="current" type="password" required placeholder="Enter current password" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="new">{hasPassword ? "New password" : "Password"}</Label>
                    <Input id="new" name="new" type="password" required minLength={6} placeholder="Min. 6 characters" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm">{hasPassword ? "Confirm new password" : "Confirm password"}</Label>
                    <Input id="confirm" name="confirm" type="password" required minLength={6} placeholder="Repeat password" />
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

              <Card>
                <CardHeader>
                  <CardTitle>Linked Accounts</CardTitle>
                  <CardDescription>
                    Connect your account to social providers for easier sign-in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {identities.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground border rounded-lg">
                        No linked accounts.
                      </div>
                    ) : identities.map(identity => (
                      <div key={identity.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="bg-muted p-2 rounded-full">
                            {identity.provider === 'google' ? (
                              <svg className="h-5 w-5" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                              </svg>
                            ) : (
                               <Link2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium capitalize">{identity.provider}</div>
                            <div className="text-sm text-muted-foreground">Connected as {identity.identity_data?.email || identity.identity_data?.name || "User"}</div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8"
                          onClick={() => {
                            if (!hasPassword) {
                              toast.error("You must set a password before you can disconnect this provider to avoid being locked out of your account.");
                              return;
                            }
                            setIdentityToDisconnect(identity);
                          }}
                          disabled={isPending}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
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

        <AlertDialog open={!!identityToDisconnect} onOpenChange={(open) => !open && setIdentityToDisconnect(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {identityToDisconnect?.provider} account?</AlertDialogTitle>
              <AlertDialogDescription>
                You will no longer be able to use your {identityToDisconnect?.provider} account to log in. 
                Make sure you have another way to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => identityToDisconnect && handleDisconnect(identityToDisconnect)}>
                Disconnect
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
