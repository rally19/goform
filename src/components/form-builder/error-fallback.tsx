"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function SyncErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const isTimeout = error.message.toLowerCase().includes("timeout") || 
                    error.message.toLowerCase().includes("timed out");

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm h-full p-6 text-center animate-in fade-in duration-500">
      <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertCircle className="h-10 w-10 text-destructive animate-pulse" />
      </div>
      
      <div className="max-w-md space-y-2">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          {isTimeout ? "Connection Timed Out" : "Sync Connection Failed"}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isTimeout 
            ? "We couldn't connect to the collaboration server within the time limit. This usually happens on slow networks or during high server load."
            : "An unexpected error occurred while entering the collaborative room. Your fields and settings are safe, but live updates are unavailable."
          }
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 w-full max-w-[200px]">
        <Button 
          onClick={resetErrorBoundary}
          className="w-full shadow-lg shadow-primary/20"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Reconnecting
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => window.location.reload()}
          className="text-muted-foreground hover:text-foreground"
        >
          Reload Dashboard
        </Button>
      </div>

      <div className="mt-12 p-3 bg-muted/30 rounded-lg border border-border/50 max-w-sm">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 opacity-50">Technical Details</p>
        <p className="text-[11px] font-mono text-muted-foreground break-all line-clamp-2">
          {error.message || "Unknown collaborative error"}
        </p>
      </div>
    </div>
  );
}
