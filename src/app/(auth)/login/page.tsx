"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "motion/react";
import { useTransition, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "../actions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { SquarePen } from "lucide-react";

// In shadcn, we prefer using pure react-hook-form with radix or use the Shadcn Form wrapper.
// Here we'll use standard inputs since they are simple enough, along with generic UI patterns.

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    setErrorMsg(null);
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    if (next) formData.append("next", next);

    startTransition(() => {
      signInAction(formData).then((res) => {
        if (res?.error) setErrorMsg(res.error);
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
                 <SquarePen className="size-4" />
               </div>
           </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Sign in code</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                {...form.register("password")}
                aria-invalid={!!form.formState.errors.password}
              />
              {form.formState.errors.password && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full transition-all active:scale-[0.98]"
              disabled={isPending || form.formState.isSubmitting}
            >
              {isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>


          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link 
              href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} 
              className="font-semibold text-primary hover:underline"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
