"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EmailConfirmPendingPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border shadow-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="size-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Almost there!
          </CardTitle>
          <CardDescription>One confirmation down, one to go.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent confirmation emails to both your{" "}
            <strong>old</strong> and <strong>new</strong> email address.
            You&apos;ve confirmed one — please check the other inbox now.
          </p>
          <div className="bg-muted/50 border rounded-lg p-4 text-sm text-left space-y-2">
            <p className="font-medium">To complete the change:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>
                Check your <strong>other</strong> inbox (old or new email).
              </li>
              <li>Click the confirmation link in that email.</li>
              <li>
                You&apos;ll be signed out and can log in with your new email.
              </li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            Links expire after 24 hours. If they expire, request a new email
            change from settings.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/settings">Back to Settings</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
