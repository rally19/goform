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
import { verifyEmailChangeAction, resendEmailChangeOtpAction } from "../actions";
import { toast } from "sonner";

const verifyEmailChangeSchema = z.object({
  oldOtp: z.string().min(6, { message: "Current email code must be 6 digits." }),
  newOtp: z.string().min(6, { message: "New email code must be 6 digits." }),
});

function VerifyEmailChangeForm() {
  const searchParams = useSearchParams();
  const oldEmail = searchParams.get("oldEmail");
  const newEmail = searchParams.get("newEmail");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15 * 60);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [isResending, setIsResending] = useState(false);

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

  const form = useForm<z.infer<typeof verifyEmailChangeSchema>>({
    resolver: zodResolver(verifyEmailChangeSchema),
    defaultValues: {
      oldOtp: "",
      newOtp: "",
    },
  });

  if (!oldEmail || !newEmail) {
    return (
      <div className="text-center text-muted-foreground p-4">
        Invalid route. Missing email parameters.
      </div>
    );
  }

  function onSubmit(values: z.infer<typeof verifyEmailChangeSchema>) {
    setErrorMsg(null);
    const formData = new FormData();
    formData.append("oldEmail", oldEmail as string);
    formData.append("newEmail", newEmail as string);
    formData.append("oldOtp", values.oldOtp);
    formData.append("newOtp", values.newOtp);

    startTransition(() => {
      verifyEmailChangeAction(formData).then((res) => {
        if (res?.error) setErrorMsg(res.error);
      });
    });
  }

  async function handleResend() {
    if (resendCountdown > 0 || isResending) return;
    
    setIsResending(true);
    setErrorMsg(null);
    
    const res = await resendEmailChangeOtpAction(newEmail as string);
    setIsResending(false);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("New codes have been sent to both your email addresses.");
      setResendCountdown(30);
      setCountdown(15 * 60);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-xl mx-auto mt-6"
    >
      <Card className="border-border shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Confirm Email Change</CardTitle>
          <CardDescription>
            We've sent verification codes to both your current email and new email address for security. 
            Please enter both codes below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {errorMsg && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm font-medium w-full text-center">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Code sent to <span className="font-semibold text-foreground">{oldEmail}</span>
                </label>
                <InputOTP
                  maxLength={6}
                  value={form.watch("oldOtp")}
                  onChange={(value) => form.setValue("oldOtp", value)}
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
                {form.formState.errors.oldOtp && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.oldOtp.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center space-y-2 pt-4 border-t border-border/50">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Code sent to <span className="font-semibold text-foreground">{newEmail}</span>
                </label>
                <InputOTP
                  maxLength={6}
                  value={form.watch("newOtp")}
                  onChange={(value) => form.setValue("newOtp", value)}
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
                {form.formState.errors.newOtp && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.newOtp.message}
                  </p>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground text-center w-full space-y-2">
              {countdown > 0 ? (
                <div>Codes expire in <span className="font-medium text-foreground">{formatTime(countdown)}</span></div>
              ) : (
                <div className="text-destructive font-medium">Codes have expired. Please restart the process.</div>
              )}
              
              <div>
                <Button 
                  type="button" 
                  variant="link" 
                  className="px-0 text-sm font-medium h-auto"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || isResending}
                >
                  {isResending ? "Sending..." : resendCountdown > 0 ? `Resend codes in ${resendCountdown}s` : "Didn't receive the codes? Resend"}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full transition-all active:scale-[0.98]"
              disabled={isPending || form.formState.isSubmitting || countdown === 0 || form.watch("oldOtp").length !== 6 || form.watch("newOtp").length !== 6}
            >
              {isPending ? "Confirming Change..." : "Update Email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div className="text-center text-muted-foreground">Loading verification...</div>}>
         <VerifyEmailChangeForm />
      </Suspense>
    </div>
  );
}
