"use client";

import { useState } from "react";
import type { Form } from "@/db/schema";
import { updateForm, deleteForm, setFormStatus } from "@/lib/actions/forms";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import { ACCENT_COLORS } from "@/lib/form-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Copy, ExternalLink, Globe, Lock } from "lucide-react";

interface SettingsClientProps {
  formId: string;
  initialForm: Form;
}

export function SettingsClient({ formId, initialForm }: SettingsClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({
    title: initialForm.title,
    description: initialForm.description ?? "",
    slug: initialForm.slug,
    accentColor: initialForm.accentColor,
    acceptResponses: initialForm.acceptResponses,
    requireAuth: initialForm.requireAuth,
    showProgress: initialForm.showProgress,
    oneResponsePerUser: initialForm.oneResponsePerUser,
    successMessage: initialForm.successMessage,
    redirectUrl: initialForm.redirectUrl ?? "",
    status: initialForm.status,
  });

  const update = (changes: Partial<typeof form>) =>
    setForm((f) => ({ ...f, ...changes }));

  const handleSave = async () => {
    setSaving(true);
    const result = await updateForm(formId, {
      title: form.title,
      description: form.description || undefined,
      slug: form.slug,
      accentColor: form.accentColor,
      acceptResponses: form.acceptResponses,
      requireAuth: form.requireAuth,
      showProgress: form.showProgress,
      oneResponsePerUser: form.oneResponsePerUser,
      successMessage: form.successMessage,
      redirectUrl: form.redirectUrl || undefined,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Settings saved");
    } else {
      toast.error(result.error ?? "Failed to save");
    }
  };

  const handleDelete = async () => {
    const result = await deleteForm(formId);
    if (result.success) {
      toast.success("Form deleted");
      router.push("/forms");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  };

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/f/${form.slug}`
    : `/f/${form.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied!");
  };

  return (
    <div className="p-4 pt-6 md:p-8 max-w-3xl mx-auto space-y-6 pb-16">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Configure your form&apos;s appearance and behavior.
        </p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic form information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Form Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Untitled Form"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe what this form is about (optional)"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                    form.accentColor === c.value
                      ? "border-foreground scale-110 shadow-md"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                  onClick={() => update({ accentColor: c.value })}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sharing */}
      <Card>
        <CardHeader>
          <CardTitle>Sharing</CardTitle>
          <CardDescription>Control how people access your form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="slug">Custom URL Slug</Label>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm border font-mono whitespace-nowrap">
                /f/
              </div>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                className="font-mono flex-1"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex-1 truncate">
                {publicUrl}
              </code>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <ToggleSetting
              id="requireAuth"
              label="Require Authentication"
              description="Only logged-in users can view and submit"
              checked={form.requireAuth}
              onCheckedChange={(v) => update({ requireAuth: v })}
              icon={Lock}
            />
          </div>
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>Behavior</CardTitle>
          <CardDescription>Control how the form works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleSetting
            id="acceptResponses"
            label="Accept Responses"
            description="Turn off to close the form to new submissions"
            checked={form.acceptResponses}
            onCheckedChange={(v) => update({ acceptResponses: v })}
          />
          <ToggleSetting
            id="showProgress"
            label="Show Progress Bar"
            description="Display page progress for multi-page forms"
            checked={form.showProgress}
            onCheckedChange={(v) => update({ showProgress: v })}
          />
          <ToggleSetting
            id="oneResponsePerUser"
            label="One Response Per User"
            description="Limit authenticated users to one submission"
            checked={form.oneResponsePerUser}
            onCheckedChange={(v) => update({ oneResponsePerUser: v })}
          />
        </CardContent>
      </Card>

      {/* Submission */}
      <Card>
        <CardHeader>
          <CardTitle>After Submission</CardTitle>
          <CardDescription>What respondents see after submitting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="successMessage">Success Message</Label>
            <Textarea
              id="successMessage"
              value={form.successMessage}
              onChange={(e) => update({ successMessage: e.target.value })}
              rows={2}
              placeholder="Thank you for your response!"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="redirectUrl">Redirect URL (optional)</Label>
            <Input
              id="redirectUrl"
              type="url"
              value={form.redirectUrl}
              onChange={(e) => update({ redirectUrl: e.target.value })}
              placeholder="https://example.com/thank-you"
            />
            <p className="text-xs text-muted-foreground">
              If set, respondents will be redirected here instead of seeing the success message.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save buttons */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Settings
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 border border-destructive/20 rounded-lg bg-destructive/5">
            <div>
              <p className="text-sm font-medium">Delete this form</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete this form and all its responses
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white shrink-0"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Form
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{form.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this form and all {initialForm.title} responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Yes, delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ToggleSetting({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background">
      <div className="flex items-start gap-3">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
        <div>
          <Label htmlFor={id} className="cursor-pointer font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
