"use client";

import { useTransition, useState, useRef, useEffect } from "react";
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
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "motion/react";
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
import { Camera, Monitor, ShieldCheck, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";
import { 
  updateProfileAction, 
  updatePasswordAction, 
  signOutOthersAction, 
  resetPasswordFromSettingsAction, 
  deleteAccountAction,
  uploadAvatarAction,
  removeAvatarAction,
  initiateEmailChangeAction,
  verifyEmailChangeAction,
  resendEmailChangeOtpAction
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
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  
  // OTP Reset Flow State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  // Inline Email Change State
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [showEmailOtpInput, setShowEmailOtpInput] = useState(false);
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);
  const [emailResendCountdown, setEmailResendCountdown] = useState(0);
  const [emailOldOtp, setEmailOldOtp] = useState("");
  const [emailNewOtp, setEmailNewOtp] = useState("");
  const [newEmailTarget, setNewEmailTarget] = useState("");
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Initialize and persist countdowns from localStorage
  useEffect(() => {
    const expiryKey = `settings_otp_expiry_${user.id}`;
    const resendKey = `settings_otp_resend_${user.id}`;
    const now = Date.now();

    const storedExpiry = localStorage.getItem(expiryKey);
    if (storedExpiry) {
      const elapsed = Math.floor((now - parseInt(storedExpiry, 10)) / 1000);
      const remaining = Math.max(0, 15 * 60 - elapsed);
      if (remaining > 0) {
        setOtpCountdown(remaining);
        setShowOtpInput(true);
      } else {
        localStorage.removeItem(expiryKey);
      }
    }

    const storedResend = localStorage.getItem(resendKey);
    if (storedResend) {
      const elapsed = Math.floor((now - parseInt(storedResend, 10)) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setResendCountdown(remaining);
    }

    // Email Change Persistence
    const emailExpiryKey = `settings_email_change_expiry_${user.id}`;
    const emailResendKey = `settings_email_change_resend_${user.id}`;
    const emailTargetKey = `settings_email_change_target_${user.id}`;

    const storedEmailExpiry = localStorage.getItem(emailExpiryKey);
    const storedEmailTarget = localStorage.getItem(emailTargetKey);

    if (storedEmailExpiry && storedEmailTarget) {
      const elapsed = Math.floor((now - parseInt(storedEmailExpiry, 10)) / 1000);
      const remaining = Math.max(0, 15 * 60 - elapsed);
      if (remaining > 0) {
        setEmailOtpCountdown(remaining);
        setNewEmailTarget(storedEmailTarget);
        setShowEmailOtpInput(true);
      } else {
        localStorage.removeItem(emailExpiryKey);
        localStorage.removeItem(emailTargetKey);
      }
    }

    const storedEmailResend = localStorage.getItem(emailResendKey);
    if (storedEmailResend) {
      const elapsed = Math.floor((now - parseInt(storedEmailResend, 10)) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setEmailResendCountdown(remaining);
    }
  }, [user.id]);

  // Main tick for both timers
  useEffect(() => {
    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1 && showOtpInput) {
          setShowOtpInput(false);
          localStorage.removeItem(`settings_otp_expiry_${user.id}`);
        }
        return prev > 0 ? prev - 1 : 0;
      });
      setResendCountdown((prev) => prev > 0 ? prev - 1 : 0);

      setEmailOtpCountdown((prev) => {
        if (prev <= 1 && showEmailOtpInput) {
          setShowEmailOtpInput(false);
          localStorage.removeItem(`settings_email_change_expiry_${user.id}`);
          localStorage.removeItem(`settings_email_change_target_${user.id}`);
        }
        return prev > 0 ? prev - 1 : 0;
      });
      setEmailResendCountdown((prev) => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [showOtpInput, showEmailOtpInput, user.id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };


  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Profile updated successfully.');
      }
    });
  };

  const handleEmailChangeInit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newEmail = formData.get('email') as string;

    startTransition(async () => {
      const res = await initiateEmailChangeAction(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setEmailChangeDialogOpen(false);
        toast.success("Verification codes sent! Please check both your current and new email addresses.");
        
        const now = Date.now();
        localStorage.setItem(`settings_email_change_expiry_${user.id}`, now.toString());
        localStorage.setItem(`settings_email_change_resend_${user.id}`, now.toString());
        localStorage.setItem(`settings_email_change_target_${user.id}`, newEmail);
        
        setNewEmailTarget(newEmail);
        setEmailOtpCountdown(15 * 60);
        setEmailResendCountdown(30);
        setShowEmailOtpInput(true);
      }
    });
  };

  const handleEmailChangeVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (emailOldOtp.length !== 6 || emailNewOtp.length !== 6) {
      toast.error("Please enter both 6-digit verification codes.");
      return;
    }

    const formData = new FormData();
    formData.append("oldEmail", user.email);
    formData.append("newEmail", newEmailTarget);
    formData.append("oldOtp", emailOldOtp);
    formData.append("newOtp", emailNewOtp);

    startTransition(async () => {
      const res = await verifyEmailChangeAction(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        // Clear persistence
        localStorage.removeItem(`settings_email_change_expiry_${user.id}`);
        localStorage.removeItem(`settings_email_change_resend_${user.id}`);
        localStorage.removeItem(`settings_email_change_target_${user.id}`);
        
        setShowEmailOtpInput(false);
        setEmailOldOtp("");
        setEmailNewOtp("");
        
        toast.success("Email changed successfully! Redirecting to login...");
        
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    });
  };

  const handleResendEmailOtp = () => {
    if (emailResendCountdown > 0 || isResendingEmail) return;
    setIsResendingEmail(true);
    
    startTransition(async () => {
      const res = await resendEmailChangeOtpAction(newEmailTarget);
      setIsResendingEmail(false);
      
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("New codes have been sent to both addresses.");
        const now = Date.now();
        localStorage.setItem(`settings_email_change_resend_${user.id}`, now.toString());
        localStorage.setItem(`settings_email_change_expiry_${user.id}`, now.toString());
        setEmailResendCountdown(30);
        setEmailOtpCountdown(15 * 60);
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updatePasswordAction(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        // Clear OTP state and storage on success
        localStorage.removeItem(`settings_otp_expiry_${user.id}`);
        localStorage.removeItem(`settings_otp_resend_${user.id}`);
        setShowOtpInput(false);
        setOtpValue("");
        setOtpCountdown(0);
        
        toast.success('Password updated. Redirecting to login...');
        
        // Manual redirect after cleanup
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    });
  };

  const handleResetPasswordRequest = () => {
    setResetConfirmOpen(false);
    startTransition(async () => {
      const res = await resetPasswordFromSettingsAction();
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reset code sent! Please check your email.");
        const now = Date.now();
        localStorage.setItem(`settings_otp_expiry_${user.id}`, now.toString());
        localStorage.setItem(`settings_otp_resend_${user.id}`, now.toString());
        setOtpCountdown(15 * 60);
        setResendCountdown(30);
        setShowOtpInput(true);
      }
    });
  };

  const handleResendOtp = () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    startTransition(async () => {
      const res = await resetPasswordFromSettingsAction();
      setIsResending(false);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("A new code has been sent.");
        const now = Date.now();
        localStorage.setItem(`settings_otp_resend_${user.id}`, now.toString());
        localStorage.setItem(`settings_otp_expiry_${user.id}`, now.toString());
        setResendCountdown(30);
        setOtpCountdown(15 * 60);
      }
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
                      <Input id="input-name" name="name" defaultValue={user.name || ""} />
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
                        {!showOtpInput && (
                          <Button
                            variant="link"
                            type="button"
                            className="px-0 h-auto font-normal text-xs text-muted-foreground hover:text-primary"
                            onClick={() => setResetConfirmOpen(true)}
                          >
                            Forgot your current password?
                          </Button>
                        )}
                      </div>
                      <PasswordInput 
                        id="current" 
                        name="current" 
                        required={!showOtpInput} 
                        disabled={showOtpInput}
                        placeholder={showOtpInput ? "Using reset code instead" : "Enter current password"} 
                      />
                    </div>
                  )}

                  <AnimatePresence>
                    {hasPassword && showOtpInput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-2 border-t border-border/50"
                      >
                        <div className="flex flex-col items-center space-y-4">
                          <Label htmlFor="token" className="text-sm font-medium">Reset Verification Code</Label>
                          <InputOTP
                            maxLength={6}
                            value={otpValue}
                            onChange={(val) => setOtpValue(val)}
                            disabled={isPending}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                          <input type="hidden" name="token" value={otpValue} />
                          
                          <div className="text-center space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Code expires in <span className="font-medium text-foreground">{formatTime(otpCountdown)}</span>
                            </p>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              disabled={resendCountdown > 0 || isResending}
                              onClick={handleResendOtp}
                            >
                              {isResending ? "Sending..." : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="space-y-1">
                    <Label htmlFor="new">{hasPassword ? "New password" : "Password"}</Label>
                    <PasswordInput id="new" name="new" required minLength={6} placeholder="Min. 6 characters" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm">{hasPassword ? "Confirm new password" : "Confirm password"}</Label>
                    <PasswordInput id="confirm" name="confirm" required minLength={6} placeholder="Repeat password" />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center gap-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : hasPassword ? "Update password" : "Create password"}
                  </Button>
                  {showOtpInput && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground"
                      onClick={() => {
                        setShowOtpInput(false);
                        localStorage.removeItem(`settings_otp_expiry_${user.id}`);
                        setOtpValue("");
                      }}
                      disabled={isPending}
                    >
                      Cancel Reset
                    </Button>
                  )}
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Address</CardTitle>
                  <CardDescription>
                    Change your current email address. This will require verification of both your current and new email addresses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Email</Label>
                    <div className="flex items-center gap-2 text-sm bg-muted/50 p-2.5 rounded-md border border-border/50">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showEmailOtpInput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6 pt-4 border-t border-border/50"
                      >
                        <form onSubmit={handleEmailChangeVerify} className="space-y-6">
                          <div className="space-y-4">
                            <div className="flex flex-col items-center space-y-3">
                              <Label className="text-sm font-medium">Verification for <span className="text-primary">{user.email}</span></Label>
                              <InputOTP
                                maxLength={6}
                                value={emailOldOtp}
                                onChange={(val) => setEmailOldOtp(val)}
                                disabled={isPending}
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>

                            <div className="flex flex-col items-center space-y-3">
                              <Label className="text-sm font-medium">Verification for <span className="text-primary">{newEmailTarget}</span></Label>
                              <InputOTP
                                maxLength={6}
                                value={emailNewOtp}
                                onChange={(val) => setEmailNewOtp(val)}
                                disabled={isPending}
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                          </div>

                          <div className="flex flex-col items-center space-y-3">
                            <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
                              {isPending ? "Verifying..." : "Confirm Email Change"}
                            </Button>
                            
                            <div className="text-center space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Codes expire in <span className="font-medium text-foreground">{formatTime(emailOtpCountdown)}</span>
                              </p>
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                disabled={emailResendCountdown > 0 || isResendingEmail}
                                onClick={handleResendEmailOtp}
                              >
                                {isResendingEmail ? "Sending..." : emailResendCountdown > 0 ? `Resend in ${emailResendCountdown}s` : "Resend codes"}
                              </Button>
                            </div>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 px-6 py-4">
                  {!showEmailOtpInput && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEmailChangeDialogOpen(true)}
                      disabled={isPending}
                    >
                      Change Email Address
                    </Button>
                  )}
                  {showEmailOtpInput && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground"
                      onClick={() => {
                        setShowEmailOtpInput(false);
                        localStorage.removeItem(`settings_email_change_expiry_${user.id}`);
                        localStorage.removeItem(`settings_email_change_target_${user.id}`);
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  )}
                </CardFooter>
              </Card>

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

        <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset your password?</AlertDialogTitle>
              <AlertDialogDescription>
                We will send a 6-digit verification code to your email address. You will be able to set a new password using this code instead of your current password.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetPasswordRequest}>
                Send code
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={emailChangeDialogOpen} onOpenChange={setEmailChangeDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleEmailChangeInit}>
              <DialogHeader>
                <DialogTitle>Change Email Address</DialogTitle>
                <DialogDescription>
                  Enter your new email and confirm your current password to start the verification process.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">New Email Address</Label>
                  <Input
                    id="target-email"
                    name="email"
                    placeholder="name@example.com"
                    type="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <PasswordInput
                    id="verify-password"
                    name="password"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEmailChangeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Verifying..." : "Start verification"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
