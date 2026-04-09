"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "motion/react";
import { useTransition, useState } from "react";
import { resetPasswordAction } from "../actions";

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
import { KeyRound } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setErrorMsg(null);
    const formData = new FormData();
    formData.append("email", values.email);

    startTransition(() => {
      resetPasswordAction(formData).then((res) => {
        if (res?.error) setErrorMsg(res.error);
        if (res?.success) setSuccess(true);
      });
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border shadow-md">
        <CardHeader className="space-y-1 text-center sm:text-left">
          <div className="flex justify-center sm:hidden mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
              <KeyRound className="size-4" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Reset password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="bg-primary/15 text-primary p-4 rounded-md text-sm font-medium border border-primary/20 text-center">
                Check your email for a link to reset your password. If it doesn&apos;t appear within a few minutes, check your spam folder.
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Return to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {errorMsg && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm font-medium">
                  {errorMsg}
                </div>
              )}
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
              <Button
                type="submit"
                className="w-full transition-all active:scale-[0.98]"
                disabled={isPending || form.formState.isSubmitting}
              >
                {isPending ? "Sending link..." : "Send Reset Link"}
              </Button>
              
              <div className="mt-6 text-center text-sm">
                Remember your password?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Log in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
