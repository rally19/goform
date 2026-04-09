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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Camera, Link2, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  updateProfileAction,
  updatePasswordAction,
  signOutOthersAction,
  disconnectProviderAction,
  deleteAccountAction,
  uploadAvatarAction,
  removeAvatarAction,
  requestEmailChangeAction,
} from "./actions";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { createClient } from "@/lib/client";
import type { UserIdentity } from "@supabase/supabase-js";

export function SettingsClient({
  user,
  identities,
  hasPassword,
}: {
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
  identities: UserIdentity[];
  hasPassword: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [signOutOthersOpen, setSignOutOthersOpen] = useState(false);
  const [identityToDisconnect, setIdentityToDisconnect] = useState<UserIdentity | null>(null);

  // Email change dialog
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<"input" | "sent">("input");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);

  const hasGoogle = identities.some((id) => id.provider === "google");
  // Social identities only (exclude email provider)
  const socialIdentities = identities.filter((id) => id.provider !== "email");

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (res?.error) toast.error(res.error);
      else toast.success("Profile updated successfully.");
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updatePasswordAction(formData);
      if (res?.error) toast.error(res.error);
      else toast.success("Password updated. You may be logged out.");
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      startTransition(async () => {
        const res = await uploadAvatarAction(formData);
        if (res?.error) toast.error(res.error);
        else toast.success("Avatar uploaded successfully.");
      });
    }
  };

  const handleRemoveAvatar = () => {
    startTransition(async () => {
      const res = await removeAvatarAction();
      if (res?.error) toast.error(res.error);
      else toast.success("Avatar removed.");
    });
  };

  const handleSignoutOthers = () => {
    setSignOutOthersOpen(false);
    startTransition(async () => {
      const res = await signOutOthersAction();
      if (res?.error) toast.error(res.error);
      else toast.success("Successfully signed out from other sessions.");
    });
  };

  const handleDisconnect = (identity: UserIdentity) => {
    setIdentityToDisconnect(null);
    startTransition(async () => {
      const res = await disconnectProviderAction(identity);
      if (res?.error) toast.error(res.error);
      else toast.success("Account disconnected.");
    });
  };

  const handleDeleteAccount = () => {
    setDeleteAccountOpen(false);
    startTransition(async () => {
      const res = await deleteAccountAction();
      if (res?.error) toast.error(res.error);
    });
  };

  const handleForgotCurrentPassword = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", user.email);
      const res = await resetPasswordAction(formData);
      if (res?.error) toast.error(res.error);
      else toast.success("Password reset link sent to your email.");
    });
  };

  const handleLinkGoogle = async () => {
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/settings`,
      },
    });
    if (error) {
      toast.error(error.message);
    }
  };

  const handleEmailChangeSubmit = () => {
    if (!newEmailInput || !newEmailInput.includes("@")) {
      setEmailChangeError("Please enter a valid email address.");
      return;
    }
    if (newEmailInput === user.email) {
      setEmailChangeError("New email must be different from your current email.");
      return;
    }
    setEmailChangeError(null);
    startTransition(async () => {
      const res = await requestEmailChangeAction(newEmailInput);
      if (res?.error) {
        setEmailChangeError(res.error);
      } else {
        setEmailChangeStep("sent");
      }
    });
  };

  const handleEmailDialogClose = () => {
    setEmailChangeOpen(false);
    // Reset after animation
    setTimeout(() => {
      setEmailChangeStep("input");
      setNewEmailInput("");
      setEmailChangeError(null);
    }, 200);
  };

  // ── UI ─────────────────────────────────────────────────────────────────────

  // Google SVG icon reused in multiple places
  const GoogleIcon = () => (
    <svg
      className="h-5 w-5"
      aria-hidden="true"
      focusable="false"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 488 512"
    >
      <path
        fill="currentColor"
        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
      />
    </svg>
  );

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
            <TabsTrigger
              value="danger"
              className="text-destructive data-[state=active]:text-destructive"
            >
              Danger
            </TabsTrigger>
          </TabsList>

          {/* ── Account Tab ──────────────────────────────────────────────── */}
          <TabsContent value="account">
            <Card>
              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription>
                    Update your display name and profile picture.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
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
                      <p className="text-sm text-muted-foreground">PNG, JPG or GIF. Max size 2MB.</p>
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

                  {/* Name only — email is in Security tab */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={user.name || ""} />
                    </div>
                    {/* Email display (read-only) */}
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <div className="flex items-center gap-2">
                        <Input value={user.email} readOnly className="bg-muted/40 cursor-default" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        To change your email, go to the{" "}
                        <button
                          type="button"
                          className="underline underline-offset-2 hover:text-foreground transition-colors"
                          onClick={() => {
                            // Switch to security tab programmatically via a data attr trick
                            document.querySelector<HTMLElement>('[data-value="security"]')?.click();
                          }}
                        >
                          Security tab
                        </button>
                        .
                      </p>
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

          {/* ── Password Tab ─────────────────────────────────────────────── */}
          <TabsContent value="password">
            <Card>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newPass = formData.get("new") as string;
                  const confirmPass = formData.get("confirm") as string;
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
                      : "Set a password so you can log in without social providers. After saving, you'll be logged out."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasPassword && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="current">Current password</Label>
                        <button
                          type="button"
                          onClick={handleForgotCurrentPassword}
                          className="text-sm font-medium text-muted-foreground hover:text-primary"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="current"
                        name="current"
                        type="password"
                        placeholder="Enter current password"
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        Leave empty if you used the &quot;Forgot password?&quot; link.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="new">{hasPassword ? "New password" : "Password"}</Label>
                    <Input
                      id="new"
                      name="new"
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm">
                      {hasPassword ? "Confirm new password" : "Confirm password"}
                    </Label>
                    <Input
                      id="confirm"
                      name="confirm"
                      type="password"
                      required
                      minLength={6}
                      placeholder="Repeat password"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending
                      ? "Saving..."
                      : hasPassword
                      ? "Update password"
                      : "Create password"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* ── Security Tab ─────────────────────────────────────────────── */}
          <TabsContent value="security">
            <div className="space-y-6">

              {/* Change Email */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Address</CardTitle>
                  <CardDescription>
                    Your current email is <strong>{user.email}</strong>. Changing it will send
                    confirmation links to both your old and new address. All linked social accounts
                    will be disconnected and must be re-linked after the change.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="border-t bg-muted/20 px-6 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmailChangeStep("input");
                      setNewEmailInput("");
                      setEmailChangeError(null);
                      setEmailChangeOpen(true);
                    }}
                    disabled={isPending}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Change Email
                  </Button>
                </CardFooter>
              </Card>

              {/* Login Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle>Login Sessions</CardTitle>
                  <CardDescription>
                    Sign out of all other sessions across different devices and browsers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    If you notice suspicious activity, sign out of all other sessions and change
                    your password.
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

              {/* Linked Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle>Linked Accounts</CardTitle>
                  <CardDescription>
                    Connect social providers for easier sign-in. Email cannot be disconnected.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Social identities */}
                    {socialIdentities.length === 0 && hasGoogle === false && (
                      <div className="p-4 text-sm text-muted-foreground border rounded-lg">
                        No linked social accounts.
                      </div>
                    )}
                    {socialIdentities.map((identity) => (
                      <div
                        key={identity.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-muted p-2 rounded-full">
                            {identity.provider === "google" ? (
                              <GoogleIcon />
                            ) : (
                              <Link2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium capitalize">{identity.provider}</div>
                            <div className="text-sm text-muted-foreground">
                              Connected as{" "}
                              {identity.identity_data?.email ||
                                identity.identity_data?.name ||
                                "User"}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            if (!hasPassword) {
                              toast.error(
                                "Set a password first before disconnecting this provider to avoid being locked out."
                              );
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

                    {/* Google "not connected" slot */}
                    {!hasGoogle && (
                      <div className="flex items-center justify-between p-4 rounded-lg border border-dashed">
                        <div className="flex items-center gap-4 opacity-60">
                          <div className="bg-muted p-2 rounded-full">
                            <GoogleIcon />
                          </div>
                          <div>
                            <div className="font-medium">Google</div>
                            <div className="text-sm text-muted-foreground">Not connected</div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={handleLinkGoogle}
                        >
                          Link Google
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Danger Tab ───────────────────────────────────────────────── */}
          <TabsContent value="danger">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data. This action cannot be
                  undone.
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

        {/* ── Dialogs ────────────────────────────────────────────────────── */}

        {/* Change Email dialog */}
        <AlertDialog open={emailChangeOpen} onOpenChange={(open) => { if (!open) handleEmailDialogClose(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Email Address</AlertDialogTitle>
              <AlertDialogDescription>
                {emailChangeStep === "input"
                  ? "Enter your new email address. We'll send confirmation links to both your current and new email — the change completes only after both are confirmed."
                  : "Check both your old and new inboxes for a confirmation link. Once you've clicked both, your email will be updated and you'll be signed out."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {emailChangeStep === "input" ? (
              <>
                <div className="space-y-2 py-2">
                  <Label htmlFor="new-email">New email address</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="new@example.com"
                    value={newEmailInput}
                    onChange={(e) => {
                      setNewEmailInput(e.target.value);
                      setEmailChangeError(null);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEmailChangeSubmit(); } }}
                    autoFocus
                  />
                  {emailChangeError && (
                    <p className="text-sm text-destructive">{emailChangeError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    ⚠️ All linked social accounts (e.g. Google) will be disconnected and must be
                    re-linked to your new email after the change.
                  </p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button onClick={handleEmailChangeSubmit} disabled={isPending}>
                    {isPending ? "Sending..." : "Send Confirmation Emails"}
                  </Button>
                </AlertDialogFooter>
              </>
            ) : (
              <AlertDialogFooter>
                <AlertDialogAction onClick={handleEmailDialogClose}>
                  Got it, close
                </AlertDialogAction>
              </AlertDialogFooter>
            )}
          </AlertDialogContent>
        </AlertDialog>

        {/* Sign out others dialog */}
        <AlertDialog open={signOutOthersOpen} onOpenChange={setSignOutOthersOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of other sessions?</AlertDialogTitle>
              <AlertDialogDescription>
                This will end all your sessions except for the current one. You will need to log
                back in on other devices.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignoutOthers}>Sign out others</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Disconnect identity dialog */}
        <AlertDialog
          open={!!identityToDisconnect}
          onOpenChange={(open) => !open && setIdentityToDisconnect(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Disconnect {identityToDisconnect?.provider} account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You will no longer be able to use your {identityToDisconnect?.provider} account to
                log in. Make sure you have another way to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  identityToDisconnect && handleDisconnect(identityToDisconnect)
                }
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete account dialog */}
        <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and all
                associated data, including your forms and responses.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} variant="destructive">
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
