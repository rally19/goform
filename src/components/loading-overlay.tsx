"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Switching workspace..." }: LoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="bg-primary/10 p-3 rounded-full">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight">{message}</p>
          <p className="text-sm text-muted-foreground animate-pulse">
            Hang tight, we're preparing your workspace
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

