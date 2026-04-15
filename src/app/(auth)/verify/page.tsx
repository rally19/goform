"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { motion } from "motion/react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifyOtpAction, resendOtpAction } from "../actions";
import { toast } from "sonner";

const verifySchema = z.object({
  pin: z.string().min(6, {
    message: "Your one-time password must be 6 characters.",
  }),
});

function VerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const type = searchParams.get("type") as "signup" | "recovery" | "magiclink" | null;
  const next = searchParams.get("next");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15 * 60);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [isResending, setIsResending] = useState(false);

  // Initialize countdowns from localStorage on mount
  useEffect(() => {
    if (!email || !type) return;

    const expiryKey = `otp_expiry_${email}_${type}`;
    const resendKey = `otp_resend_${email}_${type}`;

    const now = Date.now();
    
    // Handle Expiry Countdown
    const storedExpiry = localStorage.getItem(expiryKey);
    if (storedExpiry) {
      const startTime = parseInt(storedExpiry, 10);
      const elapsed = Math.floor((now - startTime) / 1000);
      setCountdown(Math.max(0, 15 * 60 - elapsed));
    } else {
      localStorage.setItem(expiryKey, now.toString());
    }

    // Handle Resend Countdown
    const storedResend = localStorage.getItem(resendKey);
    if (storedResend) {
      const startTime = parseInt(storedResend, 10);
      const elapsed = Math.floor((now - startTime) / 1000);
      setResendCountdown(Math.max(0, 30 - elapsed));
    } else {
      localStorage.setItem(resendKey, now.toString());
    }
  }, [email, type]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let resendTimer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      resendTimer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(resendTimer);
  }, [resendCountdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const form = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      pin: "",
    },
  });

  if (!email || !type) {
    return (
      <div className="text-center text-muted-foreground p-4">
        Invalid verification link. Missing email or type parameter.
      </div>
    );
  }

  function onSubmit(values: z.infer<typeof verifySchema>) {
    setErrorMsg(null);
    const formData = new FormData();
    formData.append("email", email as string);
    formData.append("token", values.pin);
    formData.append("type", type as string);
    if (next) formData.append("next", next);

    startTransition(() => {
      verifyOtpAction(formData).then((res) => {
        if (res?.error) {
          setErrorMsg(res.error);
        } else if (res?.success) {
          // Clear OTP persistence
          localStorage.removeItem(`otp_expiry_${email}_${type}`);
          localStorage.removeItem(`otp_resend_${email}_${type}`);
          
          // Perform the redirect provided by the server
          if (res.redirect) {
            window.location.href = res.redirect;
          }
        }
      });
    });
  }

  async function handleResend() {
    if (resendCountdown > 0 || isResending) return;
    
    setIsResending(true);
    setErrorMsg(null);
    
    const res = await resendOtpAction(email as string, type as 'signup' | 'recovery' | 'magiclink');
    setIsResending(false);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("A new code has been sent to your email.");
      const now = Date.now();
      localStorage.setItem(`otp_resend_${email}_${type}`, now.toString());
      localStorage.setItem(`otp_expiry_${email}_${type}`, now.toString());
      setResendCountdown(30);
      setCountdown(15 * 60);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border shadow-md max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Verify your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>.
            Enter it below to complete your {type === "recovery" ? "password reset" : "registration"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col items-center">
            {errorMsg && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm font-medium w-full text-center">
                {errorMsg}
              </div>
            )}
            
            <div className="flex justify-center w-full">
              <InputOTP
                maxLength={6}
                value={form.watch("pin")}
                onChange={(value) => form.setValue("pin", value)}
                disabled={isPending || form.formState.isSubmitting || countdown === 0}
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
            
            {form.formState.errors.pin && (
              <p className="text-sm font-medium text-destructive text-center w-full">
                {form.formState.errors.pin.message}
              </p>
            )}

            <div className="text-sm text-muted-foreground text-center w-full space-y-2">
              {countdown > 0 ? (
                <div>Code expires in <span className="font-medium text-foreground">{formatTime(countdown)}</span></div>
              ) : (
                <div className="text-destructive font-medium">Code has expired. Please request a new one.</div>
              )}
              
              <div>
                <Button 
                  type="button" 
                  variant="link" 
                  className="px-0 text-sm font-medium h-auto"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || isResending}
                >
                  {isResending ? "Sending..." : resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Didn't receive a code? Resend"}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full transition-all active:scale-[0.98]"
              disabled={isPending || form.formState.isSubmitting || countdown === 0 || form.watch("pin").length !== 6}
            >
              {isPending ? "Verifying..." : "Verify Code"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function VerifyPage() {
  return (
    <div className="container mx-auto px-4 h-full flex flex-col items-center justify-center pt-10">
      <Suspense fallback={<div className="text-center text-muted-foreground">Loading verification...</div>}>
         <VerifyForm />
      </Suspense>
    </div>
  );
}
