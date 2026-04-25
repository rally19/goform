"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import type { Form } from "@/db/schema";
import { updateForm, deleteForm, setFormStatus, generateNewSuffixAction, discardFormBuilderChanges } from "@/lib/actions/forms";
import QRCodeStyling from "qr-code-styling";
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
import { Loader2, Trash2, Copy, ExternalLink, Globe, Lock, ShieldCheck, ToggleLeft, CalendarClock, RefreshCw, Download } from "lucide-react";

// Helper to convert UTC Date to local datetime-local string format (YYYY-MM-DDTHH:mm)
function toLocalDatetime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function createFormState(f: Form) {
  return {
    title: f.title,
    description: f.description ?? "",
    slugCustom: f.slug.split("-").length > 1 ? f.slug.split("-").slice(0, -1).join("-") : f.slug,
    slugSuffix: f.slug.split("-").length > 1 ? f.slug.split("-").slice(-1)[0] : "",
    refreshSuffix: false,
    accentColor: f.accentColor,
    acceptResponses: f.acceptResponses,
    requireAuth: f.requireAuth,
    showProgress: f.showProgress,
    oneResponsePerUser: f.oneResponsePerUser,
    successMessage: f.successMessage,
    autoSave: f.autoSave,
    status: f.status,
    submissionLimit: (f as any).submissionLimit ?? null as number | null,
    submissionLimitEnabled: (f as any).submissionLimitEnabled ?? false,
    submissionLimitDecremental: (f as any).submissionLimitDecremental ?? false,
    submissionLimitRemaining: (f as any).submissionLimitRemaining ?? null as number | null,
    startsAt: (f as any).startsAt ? toLocalDatetime(new Date((f as any).startsAt)) : "",
    startsAtEnabled: (f as any).startsAtEnabled ?? false,
    endsAt: (f as any).endsAt ? toLocalDatetime(new Date((f as any).endsAt)) : "",
    endsAtEnabled: (f as any).endsAtEnabled ?? false,
    showStartsAt: (f as any).showStartsAt ?? false,
    showEndsAt: (f as any).showEndsAt ?? false,
  };
}


interface SettingsClientProps {
  formId: string;
  initialForm: Form;
}

export function SettingsClient({ formId, initialForm }: SettingsClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState(() => createFormState(initialForm));
  const [savedForm, setSavedForm] = useState(() => createFormState(initialForm));

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );


  const [submissionCount, setSubmissionCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [applyLimitChecked, setApplyLimitChecked] = useState(false);
  const [discardBuilderChecked, setDiscardBuilderChecked] = useState(false);

  useEffect(() => {
    if (form.autoSave) {
      setDiscardBuilderChecked(false);
    }
  }, [form.autoSave]);

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

  const [refreshingSuffix, setRefreshingSuffix] = useState(false);
  const handleRefreshSuffix = async () => {
    setRefreshingSuffix(true);
    const result = await generateNewSuffixAction();
    if (result.success && result.data) {
      update({ slugSuffix: result.data });
      toast.success("New suffix generated");
    } else {
      toast.error(result.error ?? "Failed to generate suffix");
    }
    setRefreshingSuffix(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateForm(formId, {
      title: form.title,
      description: form.description || undefined,
      slugCustom: form.slugCustom,
      slugSuffix: form.slugSuffix,
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
      submissionLimitRemaining: form.submissionLimitDecremental
        ? (applyLimitChecked && form.submissionLimit ? form.submissionLimit : (form.submissionLimitRemaining ?? null))
        : null,
      startsAt: form.startsAtEnabled && form.startsAt ? form.startsAt : null,
      startsAtEnabled: form.startsAtEnabled,
      endsAt: form.endsAtEnabled && form.endsAt ? form.endsAt : null,
      endsAtEnabled: form.endsAtEnabled,
      showStartsAt: form.showStartsAt,
      showEndsAt: form.showEndsAt,
    });
    setSaving(false);
    if (result.success) {
      if (discardBuilderChecked) {
        await discardFormBuilderChanges(formId);
      }
      toast.success("Settings saved");

      let updatedForm = { ...form, refreshSuffix: false };
      if (applyLimitChecked && form.submissionLimit) {
        updatedForm.submissionLimitRemaining = form.submissionLimit;
      }

      // If the server returned a new slug (e.g. after refresh or custom change), update state
      const serverData = result.data as { slug?: string } | undefined;
      if (serverData?.slug) {
        const parts = serverData.slug.split("-");
        updatedForm.slugSuffix = parts[parts.length - 1];
        updatedForm.slugCustom = parts.slice(0, -1).join("-");
      }

      setForm(updatedForm);
      setSavedForm(updatedForm);
      // Reset checkboxes after save
      setApplyLimitChecked(false);
      setDiscardBuilderChecked(false);
    } else {
      toast.error(result.error ?? "Failed to save");
    }
  };

  const handleDiscard = () => {
    setForm(savedForm);
    setApplyLimitChecked(false);
    toast.info("Changes discarded");
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

  const cleanTitle = useMemo(() => {
    if (typeof document === "undefined") return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = form.title;
    return tmp.textContent || tmp.innerText || "";
  }, [form.title]);

  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      qrCode.current = new QRCodeStyling({
        width: 240,
        height: 240,
        type: "svg",
        data: "",
        image: "/favicon.ico",
        margin: 21,
        dotsOptions: {
          color: "#000000",
          type: "rounded"
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 6
        },
        qrOptions: {
          errorCorrectionLevel: 'Q'
        }
      });

      if (qrRef.current) {
        qrCode.current.append(qrRef.current);
      }
    }
  }, []);

  const publicUrl = origin
    ? `${origin}/f/${form.slugCustom}-${form.slugSuffix}`
    : `/f/${form.slugCustom}-${form.slugSuffix}`;

  useEffect(() => {
    if (qrCode.current) {
      qrCode.current.update({
        data: publicUrl
      });

      qrCode.current.applyExtension((svg) => {
        // Clear existing text to prevent duplicates
        const existingTexts = svg.querySelectorAll("text");
        existingTexts.forEach(t => t.remove());

        const header = document.createElementNS("http://www.w3.org/2000/svg", "text");
        header.setAttribute("x", "120");
        header.setAttribute("y", "15");
        header.setAttribute("text-anchor", "middle");
        header.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
        header.setAttribute("font-weight", "bold");
        header.setAttribute("font-size", "15px");
        header.setAttribute("fill", "#000000");
        header.textContent = "FormTo.Link";
        svg.appendChild(header);

        const footer = document.createElementNS("http://www.w3.org/2000/svg", "text");
        footer.setAttribute("x", "120");
        footer.setAttribute("y", "235");
        footer.setAttribute("text-anchor", "middle");
        footer.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
        footer.setAttribute("font-weight", "bold");
        footer.setAttribute("font-size", "15px");
        footer.setAttribute("fill", "#000000");
        footer.textContent = cleanTitle.length > 25 ? cleanTitle.substring(0, 22) + "..." : cleanTitle;
        svg.appendChild(footer);
      });
    }
  }, [publicUrl, cleanTitle]);

  const downloadQR = () => {
    if (qrCode.current) {
      qrCode.current.download({
        name: `qr-${form.slugCustom || "form"}`,
        extension: "png"
      });
    }
  };

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
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="slugCustom">Form URL</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm border font-mono whitespace-nowrap">
                    /f/
                  </div>
                  <Input
                    id="slugCustom"
                    value={form.slugCustom}
                    onChange={(e) => update({ slugCustom: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className="font-mono flex-1"
                    placeholder="custom-url"
                  />
                  <div className="px-3 py-2 bg-muted/50 text-muted-foreground/70 rounded-md text-sm border font-mono whitespace-nowrap min-w-[90px] text-center">
                    -{form.slugSuffix || "········"}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={handleRefreshSuffix}
                    disabled={refreshingSuffix}
                    title="Refresh random suffix"
                  >
                    <RefreshCw className={cn("h-4 w-4", refreshingSuffix && "animate-spin text-primary")} />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-1">
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
            </div>

            <div className="flex flex-col items-center gap-2 p-2 bg-muted/20 rounded-xl border border-dashed border-border/60">
              <div className="p-1 bg-white rounded-lg shadow-sm border border-border/40 overflow-hidden">
                <div ref={qrRef} />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] uppercase tracking-wider font-bold gap-1.5 text-muted-foreground hover:text-primary transition-colors bg-background"
                onClick={downloadQR}
              >
                <Download className="h-3 w-3" />
                Download QR Code
              </Button>
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
                        {applyLimitChecked && form.submissionLimit !== null
                          ? `Will reset to ${form.submissionLimit} slot${form.submissionLimit !== 1 ? "s" : ""} upon saving`
                          : form.submissionLimitRemaining !== null
                            ? `${form.submissionLimitRemaining} slot${form.submissionLimitRemaining !== 1 ? "s" : ""} remaining`
                            : "Not applied yet — save settings to initialize slots"}
                      </span>
                    ) : (
                      <span>
                        {submissionCount !== null
                          ? `${submissionCount} submission${submissionCount !== 1 ? "s" : ""} used${form.submissionLimit != null
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
            <div className="space-y-3">
              <ToggleSetting
                id="autoSave"
                label="Auto Save"
                description="Automatically save changes while building the form"
                checked={form.autoSave}
                onCheckedChange={(v) => update({ autoSave: v })}
              />
              {!form.autoSave && !savedForm.autoSave && (
                <div className="flex items-start space-x-2 pl-[42px] pt-1">
                  <Checkbox
                    id="discardBuilderChanges"
                    checked={discardBuilderChecked}
                    onCheckedChange={(v) => setDiscardBuilderChecked(!!v)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="discardBuilderChanges"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Discard unsaved changes
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Reset the form builder room to match the last saved state in the database
                    </p>
                  </div>
                </div>
              )}
            </div>
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
          {(isDirty || discardBuilderChecked || applyLimitChecked) && (
            <Button variant="outline" onClick={handleDiscard} disabled={saving}>
              Discard
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || (!isDirty && !discardBuilderChecked && !applyLimitChecked)}>
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
