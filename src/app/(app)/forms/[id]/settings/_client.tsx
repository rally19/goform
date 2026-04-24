"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Form } from "@/db/schema";
import { updateForm, deleteForm, setFormStatus } from "@/lib/actions/forms";
import { getFormSubmissionCount } from "@/lib/actions/responses";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { RichText } from "@/components/ui/rich-text";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ACCENT_COLORS } from "@/lib/form-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Copy, ExternalLink, Globe, Lock, ShieldCheck, ToggleLeft, CalendarClock } from "lucide-react";

// Helper to convert UTC Date to local datetime-local string format (YYYY-MM-DDTHH:mm)
function toLocalDatetime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

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
    autoSave: initialForm.autoSave,
    status: initialForm.status,
    submissionLimit: (initialForm as any).submissionLimit ?? null as number | null,
    submissionLimitEnabled: (initialForm as any).submissionLimitEnabled ?? false,
    submissionLimitDecremental: (initialForm as any).submissionLimitDecremental ?? false,
    submissionLimitRemaining: (initialForm as any).submissionLimitRemaining ?? null as number | null,
    startsAt: (initialForm as any).startsAt ? toLocalDatetime(new Date((initialForm as any).startsAt)) : "",
    startsAtEnabled: (initialForm as any).startsAtEnabled ?? false,
    endsAt: (initialForm as any).endsAt ? toLocalDatetime(new Date((initialForm as any).endsAt)) : "",
    endsAtEnabled: (initialForm as any).endsAtEnabled ?? false,
    showStartsAt: (initialForm as any).showStartsAt ?? false,
    showEndsAt: (initialForm as any).showEndsAt ?? false,
  });

  const [submissionCount, setSubmissionCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [applyLimitChecked, setApplyLimitChecked] = useState(false);

  const fetchSubmissionCount = useCallback(async () => {
    setCountLoading(true);
    const result = await getFormSubmissionCount(formId);
    if (result.success && result.data) {
      setSubmissionCount(result.data.count);
    }
    setCountLoading(false);
  }, [formId]);

  useEffect(() => {
    if (form.submissionLimitEnabled) {
      fetchSubmissionCount();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.submissionLimitEnabled]);

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
      autoSave: form.autoSave,
      status: form.status,
      submissionLimit: form.submissionLimitEnabled ? (form.submissionLimit ?? null) : null,
      submissionLimitEnabled: form.submissionLimitEnabled,
      submissionLimitDecremental: form.submissionLimitDecremental,
      submissionLimitRemaining: form.submissionLimitDecremental ? (form.submissionLimitRemaining ?? null) : null,
      startsAt: form.startsAtEnabled && form.startsAt ? form.startsAt : null,
      startsAtEnabled: form.startsAtEnabled,
      endsAt: form.endsAtEnabled && form.endsAt ? form.endsAt : null,
      endsAtEnabled: form.endsAtEnabled,
      showStartsAt: form.showStartsAt,
      showEndsAt: form.showEndsAt,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Settings saved");
      // Reset the apply limit checkbox after save
      setApplyLimitChecked(false);
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

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = origin
    ? `${origin}/f/${form.slug}`
    : `/f/${form.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied!");
  };

  return (
    <div className="h-full overflow-y-auto">
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
              <RichText
                value={form.title}
                onChange={(val) => update({ title: val })}
                placeholder="Untitled Form"
                workspaceId={initialForm.organizationId ?? undefined}
                className="w-full text-foreground"
                minHeight="min-h-[40px]"
                multiline={false}
                allowImages={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <RichText
                value={form.description}
                onChange={(val) => update({ description: val })}
                placeholder="Describe what this form is about (optional)"
                workspaceId={initialForm.organizationId ?? undefined}
                minHeight="min-h-[100px]"
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
                id="status"
                label="Published"
                description="Make this form public and start accepting responses"
                checked={form.status === "active"}
                onCheckedChange={(v) => update({ status: v ? "active" : "draft" })}
                icon={Globe}
              />
            </div>
          </CardContent>
        </Card>

        {/* Response Acceptance */}
        <Card>
          <CardHeader>
            <CardTitle>Response Acceptance</CardTitle>
            <CardDescription>Control when and how many responses your form accepts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleSetting
              id="acceptResponses"
              label="Accept Responses"
              description="Master switch — turn off to immediately close the form to new submissions"
              checked={form.acceptResponses}
              onCheckedChange={(v) => update({ acceptResponses: v })}
            />

            <Separator />

            {/* Submission Limiter */}
            <div className={cn("rounded-lg border border-border bg-background p-3 space-y-3", (!form.submissionLimitEnabled || !form.acceptResponses) && "opacity-60")}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <ToggleLeft className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <Label htmlFor="submissionLimitEnabled" className="font-medium cursor-pointer">Submission Limit</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Cap the total number of responses accepted</p>
                  </div>
                </div>
                <Switch
                  id="submissionLimitEnabled"
                  checked={form.submissionLimitEnabled}
                  disabled={!form.acceptResponses}
                  onCheckedChange={(v) => {
                    update({ submissionLimitEnabled: v });
                    if (v) fetchSubmissionCount();
                  }}
                />
              </div>
              {form.submissionLimitEnabled && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="submissionLimit">Maximum submissions</Label>
                    <Input
                      id="submissionLimit"
                      type="number"
                      min={1}
                      step={1}
                      value={form.submissionLimit ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        update({ submissionLimit: v === "" ? null : Math.max(1, Math.floor(Number(v))) });
                      }}
                      placeholder="e.g. 100"
                      className="max-w-[160px]"
                      disabled={!form.acceptResponses}
                    />
                  </div>

                  {/* Decremental mode toggle */}
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">Decremental mode</p>
                      <p className="text-xs text-muted-foreground">Each submission counts down from the limit instead of counting up existing submissions</p>
                    </div>
                    <Switch
                      checked={form.submissionLimitDecremental}
                      disabled={!form.acceptResponses}
                      onCheckedChange={(v) => update({ submissionLimitDecremental: v })}
                    />
                  </div>

                  {/* Count display */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {countLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : form.submissionLimitDecremental ? (
                      <span>
                        {form.submissionLimitRemaining !== null
                          ? `${form.submissionLimitRemaining} slot${form.submissionLimitRemaining !== 1 ? "s" : ""} remaining`
                          : "Not applied yet — click Apply to set slots"}
                      </span>
                    ) : (
                      <span>
                        {submissionCount !== null
                          ? `${submissionCount} submission${submissionCount !== 1 ? "s" : ""} used${
                              form.submissionLimit != null
                                ? ` — ${Math.max(0, form.submissionLimit - submissionCount)} remaining`
                                : ""
                            }`
                          : "Loading count…"}
                      </span>
                    )}
                  </div>

                  {/* Apply checkbox — transient UI only; checking it resets remaining to limit in local state which is then saved with Save Settings */}
                  {form.submissionLimitDecremental && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="applyLimit"
                        checked={applyLimitChecked}
                        disabled={!form.submissionLimit || !form.acceptResponses}
                        onCheckedChange={(checked) => {
                          setApplyLimitChecked(!!checked);
                          if (checked && form.submissionLimit) {
                            update({ submissionLimitRemaining: form.submissionLimit });
                          }
                        }}
                      />
                      <Label htmlFor="applyLimit" className="text-xs cursor-pointer">Reset remaining slots back to limit</Label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Start Date */}
            <div className={cn("rounded-lg border border-border bg-background p-3 space-y-3", (!form.startsAtEnabled || !form.acceptResponses) && "opacity-60")}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <Label htmlFor="startsAtEnabled" className="font-medium cursor-pointer">Opening Date &amp; Time</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Form will not accept submissions before this date</p>
                  </div>
                </div>
                <Switch
                  id="startsAtEnabled"
                  checked={form.startsAtEnabled}
                  disabled={!form.acceptResponses}
                  onCheckedChange={(v) => update({ startsAtEnabled: v })}
                />
              </div>
              {form.startsAtEnabled && (
                <div className="pt-1">
                  <Input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => update({ startsAt: e.target.value })}
                    className="max-w-[260px]"
                  />
                  {form.endsAt && form.startsAt && form.endsAtEnabled && form.startsAt >= form.endsAt && (
                    <p className="text-xs text-destructive mt-1">Opening date must be before the closing date.</p>
                  )}
                  {/* Show start date toggle */}
                  <div className="flex items-center justify-between mt-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">Show opening date to respondents</p>
                      <p className="text-xs text-muted-foreground">Display the form opening date/time in the public form</p>
                    </div>
                    <Switch
                      checked={form.showStartsAt}
                      disabled={!form.acceptResponses}
                      onCheckedChange={(v) => update({ showStartsAt: v })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* End Date */}
            <div className={cn("rounded-lg border border-border bg-background p-3 space-y-3", (!form.endsAtEnabled || !form.acceptResponses) && "opacity-60")}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <Label htmlFor="endsAtEnabled" className="font-medium cursor-pointer">Closing Date &amp; Time</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Form stops accepting submissions after this date — overrides all other settings</p>
                  </div>
                </div>
                <Switch
                  id="endsAtEnabled"
                  checked={form.endsAtEnabled}
                  disabled={!form.acceptResponses}
                  onCheckedChange={(v) => update({ endsAtEnabled: v })}
                />
              </div>
              {form.endsAtEnabled && (
                <div className="pt-1">
                  <Input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => update({ endsAt: e.target.value })}
                    className="max-w-[260px]"
                  />
                  {form.endsAt && form.startsAt && form.startsAtEnabled && form.endsAt <= form.startsAt && (
                    <p className="text-xs text-destructive mt-1">Closing date must be after the opening date.</p>
                  )}
                  {/* Show end date toggle */}
                  <div className="flex items-center justify-between mt-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">Show closing date to respondents</p>
                      <p className="text-xs text-muted-foreground">Display the form closing date/time under the description</p>
                    </div>
                    <Switch
                      checked={form.showEndsAt}
                      disabled={!form.acceptResponses}
                      onCheckedChange={(v) => update({ showEndsAt: v })}
                    />
                  </div>
                </div>
              )}
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
              id="showProgress"
              label="Show Progress Bar"
              description="Display page progress for multi-page forms"
              checked={form.showProgress}
              onCheckedChange={(v) => update({ showProgress: v })}
            />
            <ToggleSetting
              id="autoSave"
              label="Auto Save"
              description="Automatically save changes while building the form"
              checked={form.autoSave}
              onCheckedChange={(v) => update({ autoSave: v })}
            />
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Control who can submit this form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleSetting
              id="requireAuth"
              label="Require Authentication"
              description="Only signed-in users can view and submit this form"
              checked={form.requireAuth}
              onCheckedChange={(v) =>
                update({ requireAuth: v, oneResponsePerUser: v ? form.oneResponsePerUser : false })
              }
              icon={Lock}
            />
            <ToggleSetting
              id="oneResponsePerUser"
              label="One Response Per User"
              description="Limit each authenticated user to a single submission"
              checked={form.oneResponsePerUser}
              onCheckedChange={(v) => update({ oneResponsePerUser: v })}
              icon={ShieldCheck}
              disabled={!form.requireAuth}
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
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground mt-2">
              <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                For more complex success pages or to set up a conditional redirect URL after submission, 
                please use the <Link href={`/forms/${formId}/logic`} className="text-primary hover:underline font-medium">Logic builder</Link>.
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
                variant="destructive"
              >
                Yes, delete it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
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
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  icon?: React.ElementType;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between p-3 border border-border rounded-lg bg-background", disabled && "opacity-50")}>
      <div className="flex items-start gap-3">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
        <div>
          <Label htmlFor={id} className={cn("font-medium", !disabled && "cursor-pointer")}>{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
