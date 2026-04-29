"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { FormField } from "@/db/schema";
import type { FormAnswer } from "@/lib/form-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PenTool, Type as TypeIcon, Upload, Trash2 } from "lucide-react";

// Maximum allowed size for stored signature data URLs (~250KB encoded)
const MAX_SIG_BYTES = 250_000;

const TYPE_FONTS = [
  { label: "Cursive", value: '"Brush Script MT", "Lucida Handwriting", cursive' },
  { label: "Italic", value: 'Georgia, "Times New Roman", serif' },
  { label: "Sans", value: 'Helvetica, Arial, sans-serif' },
];

export type SignatureValue = {
  kind: "draw" | "type" | "upload";
  dataUrl: string;
  text?: string;
  font?: string;
};

function isSignatureValue(v: unknown): v is SignatureValue {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    (o.kind === "draw" || o.kind === "type" || o.kind === "upload") &&
    typeof o.dataUrl === "string"
  );
}

interface Props {
  field: FormField;
  value: FormAnswer;
  onChange: (v: FormAnswer) => void;
  accentColor: string;
  disabled?: boolean;
  error?: string;
}

export function SignatureField({ field, value, onChange, accentColor, disabled, error }: Props) {
  const props = field.properties ?? {};
  const allowedModes: ("draw" | "type" | "upload")[] = (props as any).signatureModes ?? [
    "draw",
    "type",
    "upload",
  ];
  const penColor = (props as any).penColor ?? "#111827";
  const bgColor: string = (props as any).signatureBgColor ?? "";

  const current = isSignatureValue(value) ? value : null;
  const [mode, setMode] = useState<"draw" | "type" | "upload">(
    current?.kind ?? allowedModes[0] ?? "draw",
  );

  return (
    <div className="space-y-2 max-w-sm">
      {allowedModes.length > 1 && (
        <div className="flex items-center gap-1 border rounded-md bg-muted/30 p-0.5 w-fit">
          {allowedModes.includes("draw") && (
            <ModeButton
              active={mode === "draw"}
              onClick={() => setMode("draw")}
              accentColor={accentColor}
              icon={<PenTool className="h-3.5 w-3.5" />}
              label="Draw"
              disabled={disabled}
            />
          )}
          {allowedModes.includes("type") && (
            <ModeButton
              active={mode === "type"}
              onClick={() => setMode("type")}
              accentColor={accentColor}
              icon={<TypeIcon className="h-3.5 w-3.5" />}
              label="Type"
              disabled={disabled}
            />
          )}
          {allowedModes.includes("upload") && (
            <ModeButton
              active={mode === "upload"}
              onClick={() => setMode("upload")}
              accentColor={accentColor}
              icon={<Upload className="h-3.5 w-3.5" />}
              label="Upload"
              disabled={disabled}
            />
          )}
        </div>
      )}

      {mode === "draw" && (
        <DrawPad
          value={current && current.kind === "draw" ? current : null}
          onChange={onChange}
          penColor={penColor}
          bgColor={bgColor}
          accentColor={accentColor}
          disabled={disabled}
          error={!!error}
        />
      )}
      {mode === "type" && (
        <TypeSign
          value={current && current.kind === "type" ? current : null}
          onChange={onChange}
          penColor={penColor}
          accentColor={accentColor}
          disabled={disabled}
          error={!!error}
        />
      )}
      {mode === "upload" && (
        <UploadSign
          value={current && current.kind === "upload" ? current : null}
          onChange={onChange}
          accentColor={accentColor}
          disabled={disabled}
          error={!!error}
        />
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  accentColor,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  accentColor: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors",
        active
          ? "bg-card shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
      style={active ? { color: accentColor } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Draw mode ────────────────────────────────────────────────────────────────

function DrawPad({
  value,
  onChange,
  penColor,
  bgColor,
  accentColor,
  disabled,
  error,
}: {
  value: SignatureValue | null;
  onChange: (v: FormAnswer) => void;
  penColor: string;
  bgColor: string;
  accentColor: string;
  disabled?: boolean;
  error?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);
  const [restored, setRestored] = useState(false);

  // True when an opaque background should be baked into the exported PNG.
  const hasOpaqueBg = !!bgColor && bgColor !== "transparent";

  // Set up canvas with proper DPR sizing.
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width);
    const h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(dpr, dpr);
    if (hasOpaqueBg) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = penColor;
    return ctx;
  }, [penColor, bgColor, hasOpaqueBg]);

  // Restore existing value into the canvas (e.g., from autosave).
  useEffect(() => {
    const ctx = setupCanvas();
    if (!ctx) return;
    if (value?.dataUrl && !restored) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        hasInkRef.current = true;
        setRestored(true);
      };
      img.src = value.dataUrl;
    }
    // Resize observer to keep canvas crisp
    const ro = new ResizeObserver(() => {
      // Preserve current image when resizing.
      const canvas = canvasRef.current;
      if (!canvas) return;
      const snapshot = hasInkRef.current ? canvas.toDataURL("image/png") : null;
      const ctx2 = setupCanvas();
      if (snapshot && ctx2) {
        const img = new Image();
        img.onload = () => {
          const c = canvasRef.current;
          if (!c) return;
          const dpr = window.devicePixelRatio || 1;
          ctx2.drawImage(img, 0, 0, c.width / dpr, c.height / dpr);
        };
        img.src = snapshot;
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupCanvas]);

  const getPoint = (e: PointerEvent | React.PointerEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    const last = lastPointRef.current;
    if (!p || !last) return;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    hasInkRef.current = true;
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !hasInkRef.current) return;
    const dataUrl = canvas.toDataURL("image/png");
    if (dataUrl.length > MAX_SIG_BYTES * 1.4) {
      // Approx base64 overhead — warn but still allow.
    }
    onChange({ kind: "draw", dataUrl } as unknown as FormAnswer);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hasOpaqueBg) {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = penColor;
      // dpr scale was lost above; reapply
      ctx.scale(dpr, dpr);
    }
    hasInkRef.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={cn(
          "relative w-full rounded-md border overflow-hidden",
          hasOpaqueBg ? "" : "bg-card",
          error ? "border-destructive" : "border-input",
        )}
        style={hasOpaqueBg ? { backgroundColor: bgColor } : undefined}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
          className="block w-full touch-none cursor-crosshair"
          aria-label="Signature drawing area"
        />
        {!hasInkRef.current && !value?.dataUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-muted-foreground/70 select-none">
            Sign here
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Use your mouse or finger to sign.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={disabled}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}

// ─── Type mode ────────────────────────────────────────────────────────────────

function renderTextToDataUrl(text: string, font: string, color: string): string {
  if (!text.trim()) return "";
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  const w = 600;
  const h = 120;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(dpr, dpr);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = `48px ${font}`;
  ctx.fillText(text, w / 2, h / 2, w - 20);
  return canvas.toDataURL("image/png");
}

function TypeSign({
  value,
  onChange,
  penColor,
  accentColor,
  disabled,
  error,
}: {
  value: SignatureValue | null;
  onChange: (v: FormAnswer) => void;
  penColor: string;
  accentColor: string;
  disabled?: boolean;
  error?: boolean;
}) {
  const [text, setText] = useState(value?.text ?? "");
  const [font, setFont] = useState(value?.font ?? TYPE_FONTS[0].value);

  const update = (newText: string, newFont: string) => {
    setText(newText);
    setFont(newFont);
    if (!newText.trim()) {
      onChange(null);
      return;
    }
    const dataUrl = renderTextToDataUrl(newText, newFont, penColor);
    onChange({ kind: "type", dataUrl, text: newText, font: newFont } as unknown as FormAnswer);
  };

  return (
    <div className="space-y-2">
      <Input
        value={text}
        onChange={(e) => update(e.target.value, font)}
        placeholder="Type your full name"
        disabled={disabled}
        className={cn("h-10", error ? "border-destructive" : "")}
        maxLength={80}
      />
      <div className="flex items-center gap-1 flex-wrap">
        {TYPE_FONTS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => update(text, f.value)}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 rounded-md border text-base transition-colors",
              font === f.value
                ? "border-current bg-muted/50"
                : "border-input hover:bg-muted/30 text-muted-foreground",
            )}
            style={{ fontFamily: f.value, color: font === f.value ? accentColor : undefined }}
          >
            {text || "Signature"}
          </button>
        ))}
      </div>
      {text.trim() && (
        <div
          className="flex items-center justify-center min-h-[80px] rounded-md border border-input bg-card px-3 py-2"
          style={{ fontFamily: font, fontSize: "2rem", color: penColor }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

// ─── Upload mode ──────────────────────────────────────────────────────────────

function UploadSign({
  value,
  onChange,
  accentColor,
  disabled,
  error,
}: {
  value: SignatureValue | null;
  onChange: (v: FormAnswer) => void;
  accentColor: string;
  disabled?: boolean;
  error?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setErrMsg(null);
    if (!file.type.startsWith("image/")) {
      setErrMsg("Please upload an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrMsg("Image must be under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      onChange({ kind: "upload", dataUrl } as unknown as FormAnswer);
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {value?.dataUrl ? (
        <div
          className={cn(
            "relative rounded-md border bg-card p-3 flex items-center justify-center min-h-[120px]",
            error ? "border-destructive" : "border-input",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.dataUrl}
            alt="Uploaded signature"
            className="max-h-32 w-auto"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "w-full rounded-md border-2 border-dashed p-6 flex flex-col items-center gap-1 text-sm text-muted-foreground hover:bg-muted/30 transition-colors",
            error ? "border-destructive" : "border-input",
          )}
        >
          <Upload className="h-5 w-5" />
          <span>Click to upload signature image</span>
          <span className="text-[10px]">PNG, JPG, up to 2 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="flex items-center justify-between gap-2">
        {errMsg ? (
          <p className="text-[11px] text-destructive">{errMsg}</p>
        ) : (
          <span />
        )}
        {value?.dataUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={disabled}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
