"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "motion/react";
import { useTransition, useState } from "react";
import { resetPasswordAction } from "../actions";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

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
import { SquarePen } from "lucide-react";
import { toast } from "sonner";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = React.useRef<TurnstileInstance>(null);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    const formData = new FormData();
    formData.append("email", values.email);
    if (turnstileToken) formData.append("cf-turnstile-response", turnstileToken);

    startTransition(async () => {
      const res = await resetPasswordAction(formData);
      if (res?.error) {
        toast.error(res.error);
        // Reset turnstile on error
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      } else {
        setIsSubmitted(true);
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="border-border shadow-md">
        <CardHeader className="space-y-1 text-center sm:text-left">
          <div className="flex justify-center sm:hidden mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
              <SquarePen className="size-4" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Reset password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset OTP
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 text-primary rounded-md text-sm font-medium text-center">
                Check your email for a OTP to reset your password. If it doesn't appear within a few minutes, check your spam folder.
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Return to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...form.register("email")}
                  aria-invalid={!!form.formState.errors.email}
                />
                {form.formState.errors.email && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex justify-center py-2">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              </div>

              <Button
                type="submit"
                className="w-full transition-transform active:scale-[0.98]"
                disabled={isPending || form.formState.isSubmitting || !turnstileToken}
              >
                {isPending ? "Sending OTP..." : "Send Reset OTP"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            Remember your password?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
