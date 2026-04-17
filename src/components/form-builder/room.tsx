"use client";

import { ReactNode, useMemo } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
  useStatus,
} from "@liveblocks/react";
import { LiveList, LiveObject } from "@liveblocks/client";
import { Loader2 } from "lucide-react";
import type { BuilderField, BuilderForm, BuilderSection } from "@/lib/form-types";
import { useState, useEffect, useCallback } from "react";
import { RoomErrorBoundary } from "./room-error-boundary";
import { SyncErrorFallback } from "./error-fallback";

interface RoomProps {
  children: ReactNode;
  roomId: string;
  initialForm?: BuilderForm;
  initialFields?: BuilderField[];
}

export function Room({ children, roomId, initialForm, initialFields }: RoomProps) {
  // We use useMemo to ensure initialStorage is stable across re-renders
  const defaultSectionId = useMemo(() => crypto.randomUUID(), []);

  const initialStorage = useMemo(() => {
    const defaultSection: BuilderSection = {
      id: defaultSectionId,
      name: "Section 1",
      description: "",
      orderIndex: 0,
    };
    return {
      fields: new LiveList((initialFields || []).map(f => new LiveObject(f))),
      formMetadata: new LiveObject(initialForm || {
        id: "",
        title: "",
        description: "",
        slug: "",
        status: "draft" as const,
        accentColor: "#6366f1",
        acceptResponses: true,
        requireAuth: false,
        showProgress: true,
        oneResponsePerUser: false,
        successMessage: "Thank you for your response!",
        autoSave: true,
        collaborationEnabled: true,
      }),
      sections: new LiveList([new LiveObject(defaultSection)]),
    };
  }, [initialFields, initialForm, defaultSectionId]);
  
  const [localAuthError, setLocalAuthError] = useState<Error | null>(null);

  const resolveAuth = useCallback(async (room?: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const response = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const err = new Error(`Auth failed (${response.status}): ${errorText || "Unknown error"}`);
        setLocalAuthError(err);
        throw err;
      }

      setLocalAuthError(null);
      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      const finalErr = err instanceof Error && err.name === "AbortError" 
        ? new Error("Authentication timed out during auth. This often happens on slow networks or cold-start functions.")
        : (err instanceof Error ? err : new Error(String(err)));
      
      setLocalAuthError(finalErr);
      throw finalErr;
    }
  }, []);

  if (localAuthError) {
    return (
      <SyncErrorFallback 
        error={localAuthError} 
        resetErrorBoundary={() => setLocalAuthError(null)} 
      />
    );
  }

  return (
    <RoomErrorBoundary fallback={SyncErrorFallback}>
      <LiveblocksProvider authEndpoint={resolveAuth}>
        <RoomProvider 
          id={roomId} 
          initialPresence={{ 
            cursor: null, 
            selectedFieldId: null,
            draggingFieldId: null 
          }}
          initialStorage={initialStorage}
        >
          <ClientSideSuspense fallback={<Loading />}>
            <ReadyBoundary>
              {children}
            </ReadyBoundary>
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </RoomErrorBoundary>
  );
}

function ReadyBoundary({ children }: { children: ReactNode }) {
  const status = useStatus();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Small delay to ensure form components have settled after mount
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // We wait for both the collaborative engine to be connected AND the component to be mounted/settled
  const isReady = status === "connected" && isMounted;

  if (!isReady) {
    return <Loading />;
  }

  return <>{children}</>;
}

function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm h-full gap-4 animate-in fade-in duration-500">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <Loader2 className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h3 className="text-sm font-semibold text-foreground">Entering Room</h3>
        <p className="text-xs text-muted-foreground">Syncing collaborative state...</p>
      </div>
    </div>
  );
}
