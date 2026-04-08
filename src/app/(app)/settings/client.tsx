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
import { Camera, Monitor, ShieldCheck, LogOut, Link2 } from "lucide-react";
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
  identities 
}: { 
  user: { id: string, name: string | null, email: string, avatarUrl: string | null },
  identities: UserIdentity[]
}) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (res?.error) setMessage({ type: 'error', text: res.error });
      else setMessage({ type: 'success', text: 'Profile updated successfully.' });
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updatePasswordAction(formData);
      if (res?.error) setMessage({ type: 'error', text: res.error });
      else setMessage({ type: 'success', text: 'Password updated. You may be logged out.' });
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      startTransition(async () => {
        const res = await uploadAvatarAction(formData);
        if (res?.error) setMessage({ type: 'error', text: res.error });
        else setMessage({ type: 'success', text: 'Avatar uploaded successfully.' });
      });
    }
  };

  const handleRemoveAvatar = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await removeAvatarAction();
      if (res?.error) setMessage({ type: 'error', text: res.error });
      else setMessage({ type: 'success', text: 'Avatar removed.' });
    });
  };

  const handleSignoutOthers = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await signOutOthersAction();
      if (res?.error) setMessage({ type: 'error', text: res.error });
      else setMessage({ type: 'success', text: 'Successfully signed out from other sessions.' });
    });
  };

  const handleDisconnect = (identity: UserIdentity) => {
    setMessage(null);
    startTransition(async () => {
      const res = await disconnectProviderAction(identity);
      if (res?.error) setMessage({ type: 'error', text: res.error });
      else setMessage({ type: 'success', text: 'Identity disconnected.' });
    });
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
      setMessage(null);
      startTransition(async () => {
        const res = await deleteAccountAction();
        if (res?.error) setMessage({ type: 'error', text: res.error });
      });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      
      {message && (
        <div className={`p-4 mb-4 rounded-md text-sm font-medium ${message.type === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
          {message.text}
        </div>
      )}

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
              <form onSubmit={handleProfileSubmit}>
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
              <form onSubmit={handlePasswordSubmit}>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Change your password here. After saving, you&apos;ll be logged out.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="new">New password</Label>
                    <Input id="new" name="new" type="password" required minLength={6} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Save password"}
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
                    onClick={handleSignoutOthers}
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
                          onClick={() => handleDisconnect(identity)}
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
                  onClick={handleDeleteAccount}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Delete Account"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
