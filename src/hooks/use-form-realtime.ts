"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/client";
import { useFormBuilder, type CollaboratorInfo } from "./use-form-builder";
import type { BuilderField, BuilderForm } from "@/lib/form-types";
import { mapFormUpdate } from "./use-form-realtime-utils";
import {
  pingActiveSession,
  removeActiveSession,
  getActiveSessions,
  updateFieldLock,
} from "@/lib/actions/collaboration";

// ─── Collaborator colors (stable per user) ─────────────────────────────────────
const COLLAB_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f97316",
  "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899",
];

export function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export type BroadcastPayload =
  | { type: "FORM_UPDATE"; fields: BuilderField[]; form: Partial<BuilderForm>; senderId: string }
  | { type: "COLLAB_DISABLED"; senderId: string }
  | { type: "SELECTION_CHANGE"; userId: string; name: string; color: string; fieldId: string | null; senderId: string }
  | { type: "COLLAB_TOGGLE"; enabled: boolean; senderId: string };

export interface UseFormRealtimeOptions {
  formId: string;
  broadcastEnabled: boolean;
  currentUser: { id: string; name: string; email: string };
  onKicked: () => void;
}

export function useFormRealtime({
  formId,
  broadcastEnabled,
  currentUser,
  onKicked,
}: UseFormRealtimeOptions) {
  const { applyRemoteUpdate, setCollaborators, selectedFieldId, fields } = useFormBuilder();

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const myColor = useRef(pickColor(currentUser.id));
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;
  const myPresenceKey = `${currentUser.id}_${instanceId}`;
  
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const dbPingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const previousSelectedFieldId = useRef<string | null>(null);
  
  // Performance: Throttling & Debounce timers
  const broadcastThrottleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const presenceDebounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lockDebounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingUpdateRef = useRef<{ fields: BuilderField[]; form: Partial<BuilderForm> } | null>(null);

  // ─── Referencing Callbacks Safely ───────────────────────────────────────────
  const applyRemoteUpdateRef = useRef(applyRemoteUpdate);
  applyRemoteUpdateRef.current = applyRemoteUpdate;
  const setCollaboratorsRef = useRef(setCollaborators);
  setCollaboratorsRef.current = setCollaborators;
  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;
  const broadcastEnabledRef = useRef(broadcastEnabled);
  broadcastEnabledRef.current = broadcastEnabled;

  const [isSecondary, setIsSecondary] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const hasSyncedOnce = useRef(false);

  // ─── Database Sync Handlers ────────────────────────────────────────────────
  
  const syncSessionsFromDB = useCallback(async () => {
    const res = await getActiveSessions(formId);
    if (!res.success || !res.data) {
      // If we fail but haven't synced yet, we stay not ready 
      // though ideally we might want a timeout.
      return;
    }
    
    const allSessions = res.data;
    // Find our own position based on joinedAt
    const mySession = allSessions.find(s => s.presenceKey === myPresenceKey);
    const formState = useFormBuilder.getState().form;
    const lastToggledBy = formState?.lastToggledBy;
    
    // PRIORITY LOGIC:
    // 1. If someone just toggled collab OFF, they are the boss regardless of joinedAt
    // 2. Fallback to joinedAt (earliest joiner is primary)
    
    if (lastToggledBy && allSessions.some(s => s.userId === lastToggledBy)) {
      // Toggle Authority exists and is active in the session
      setIsSecondary(currentUser.id !== lastToggledBy);
    } else {
      // Fallback to strict Join Order (Database sorted by joinedAt then serialId)
      const primarySession = allSessions[0];
      setIsSecondary(mySession?.id !== primarySession?.id);
    }

    const result: CollaboratorInfo[] = [];
    for (const s of allSessions) {
      if (s.presenceKey === myPresenceKey) continue;
      result.push({
        userId: s.userId,
        name: s.userId === currentUser.id ? `${s.name} (Other Tab)` : s.name,
        email: s.email,
        color: s.color,
        selectedFieldId: s.selectedFieldIdText ?? null,
        presenceKey: s.presenceKey,
      });
    }
    setCollaboratorsRef.current(result);
    
    if (!hasSyncedOnce.current) {
      hasSyncedOnce.current = true;
      setIsReady(true);
    }
  }, [formId, currentUser.id, myPresenceKey]);

  // Re-run priority check whenever lastToggledBy changes (e.g. from broadcast)
  const lastToggledBy = useFormBuilder(s => s.form?.lastToggledBy);
  useEffect(() => {
    if (hasSyncedOnce.current) {
      syncSessionsFromDB();
    }
  }, [lastToggledBy, syncSessionsFromDB]);

  // ─── Keep-Alive Ping (Heartbeat) ───────────────────────────────────────────
  
  // Every 5 seconds, ping the sessions table
  useEffect(() => {
    if (!currentUser.id || currentUser.id === "anon") return;
    
    // Initial ping
    pingActiveSession(
      formId,
      myPresenceKey,
      currentUser.id,
      currentUser.name,
      currentUser.email,
      myColor.current,
      selectedFieldId
    );

    pingIntervalRef.current = setInterval(() => {
      pingActiveSession(
        formId,
        myPresenceKey,
        currentUser.id,
        currentUser.name,
        currentUser.email,
        myColor.current,
        useFormBuilder.getState().selectedFieldId
      );
    }, 5000);

    return () => {
      clearInterval(pingIntervalRef.current);
      removeActiveSession(formId, myPresenceKey);
      // also release locks?
      if (previousSelectedFieldId.current) {
         updateFieldLock(formId, previousSelectedFieldId.current, null);
      }
    };
  }, [formId, myPresenceKey, currentUser, syncSessionsFromDB, myColor]);

    // ─── Broadcast selection change instantly (Fast Path) ────────────────────
    const broadcastSelection = useCallback((fieldId: string | null) => {
      // Use the latest state to get up-to-date name/color
      const state = useFormBuilder.getState();
      if (!channelRef.current || !broadcastEnabledRef.current) return;
      
      channelRef.current.send({
        type: "broadcast",
        event: "SELECTION_CHANGE",
        payload: {
          type: "SELECTION_CHANGE",
          userId: currentUser.id,
          name: currentUser.name,
          color: myColor.current,
          fieldId,
          senderId: currentUser.id,
        } satisfies BroadcastPayload,
      });
    }, [currentUser.id]);

  // Handle locking a specific field instantly when selectedFieldId changes
  useEffect(() => {
    const current = selectedFieldId;
    const prev = previousSelectedFieldId.current;
    
    // FAST PATH: Broadcast immediately via WebSocket
    broadcastSelection(current);

    // BACKGROUND PATH: Update DB (Debounced slightly to prevent spam)
    if (dbPingTimeoutRef.current) clearTimeout(dbPingTimeoutRef.current);
    dbPingTimeoutRef.current = setTimeout(async () => {
      if (prev && prev !== current) {
        await updateFieldLock(formId, prev, null);
      }
      if (current && !current.startsWith("new:")) {
        await updateFieldLock(formId, current, currentUser.id);
      }
      
      // Also ping the sessions table to stay in the header list
      await pingActiveSession(
        formId,
        myPresenceKey,
        currentUser.id,
        currentUser.name,
        currentUser.email,
        myColor.current,
        current
      );
    }, 100); // 100ms debounce
    
    previousSelectedFieldId.current = current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFieldId]);

  // ─── Broadcast form state update to peers (Throttled with Trailing Edge) ──
  const broadcastState = useCallback(
    (fieldsSnapshot: BuilderField[], formSnapshot: Partial<BuilderForm>) => {
      if (!channelRef.current || !broadcastEnabledRef.current) return;
      
      // If a broadcast is already in the cooling-off period, store this update
      // as the 'trailing' one to be sent when the timer expires.
      if (broadcastThrottleTimer.current) {
        pendingUpdateRef.current = { fields: fieldsSnapshot, form: formSnapshot };
        return;
      }

      // Otherwise, send immediately (Leading edge)
      channelRef.current.send({
        type: "broadcast",
        event: "FORM_UPDATE",
        payload: {
          type: "FORM_UPDATE",
          fields: fieldsSnapshot,
          form: formSnapshot,
          senderId: currentUser.id,
        } satisfies BroadcastPayload,
      });

      // Start the cooling-off period
      broadcastThrottleTimer.current = setTimeout(() => {
        broadcastThrottleTimer.current = undefined;
        
        // When the timer expires, if there's a pending update (the trailing edge),
        // send it immediately and recursively start a new throttle window if needed.
        if (pendingUpdateRef.current) {
          const { fields, form } = pendingUpdateRef.current;
          pendingUpdateRef.current = null;
          broadcastState(fields, form);
        }
      }, 100);
    },
    [currentUser.id]
  );

  // ─── Broadcast COLLAB_DISABLED (kick everyone) ─────────────────────────────
  const broadcastKick = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "COLLAB_DISABLED",
      payload: {
        type: "COLLAB_DISABLED",
        senderId: currentUser.id,
      } satisfies BroadcastPayload,
    });
  }, [currentUser.id]);

  // ─── Supabase Channel Subscription & Postgres Changes ───────────────────────
  useEffect(() => {
    if (!currentUser.id || currentUser.id === "anon") return;

    const supabase = createClient();
    const channel = supabase.channel(`form_builder_${formId}`);
    channelRef.current = channel;

    channel
      // Broadcast: form updates (content changes)
      .on("broadcast", { event: "FORM_UPDATE" }, ({ payload }: { payload: BroadcastPayload }) => {
        // We allow processing form updates as long as they aren't from us.
        // If collaboration is off, the UI will ignore edits anyway, but we allow syncing metadata.
        if (payload.type !== "FORM_UPDATE") return;
        if (payload.senderId === currentUser.id) return;
        
        // DRAG ISOLATION: If we are currently dragging a field locally,
        // ignore incoming field updates to prevent UI jumping/flickering.
        if (useFormBuilder.getState().isDragging) return;

        applyRemoteUpdateRef.current({ fields: payload.fields, form: payload.form });
      })
      // Broadcast: collab toggle → fast path admission control
      .on("broadcast", { event: "COLLAB_TOGGLE" }, ({ payload }: { payload: BroadcastPayload }) => {
        if (payload.type !== "COLLAB_TOGGLE") return;
        if (payload.senderId === currentUser.id) return; 
        
        // Fast-path: Update UI state before DB catches up
        useFormBuilder.getState().setFormMeta({ collaborationEnabled: payload.enabled });
        
        // Immediate re-validation of admission hierarchy
        syncSessionsFromDB();
      })
      // Broadcast: selection change (Fast Path)
      .on("broadcast", { event: "SELECTION_CHANGE" }, ({ payload }: { payload: BroadcastPayload }) => {
        if (payload.type !== "SELECTION_CHANGE") return;
        if (payload.senderId === currentUser.id) return;
        useFormBuilder.getState().updateCollaboratorSelection(payload.userId, payload.name, payload.color, payload.fieldId);
      })
      // Database: Watch form metadata changes (Collaboration toggle, Accent color, etc.)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "forms", filter: `id=eq.${formId}` },
        (payload: Record<string, any>) => {
          // ARCHIVE PROTECTOR: If collaboration is active, we PRIORITIZE broadcasts.
          // We only allow DB updates to sync metadata, not the core layout or content
          // while a session is live, to prevent 'Postgres Echos' from jumping components.
          const state = useFormBuilder.getState();
          const newDoc = payload.new as Record<string, any>;
          const mappedDoc: Partial<BuilderForm> = {};
          
          // Only sync metadata fields from DB, keep layout state broadcast-driven
          if ("title" in newDoc) mappedDoc.title = newDoc.title;
          if ("description" in newDoc) mappedDoc.description = newDoc.description;
          if ("accent_color" in newDoc) mappedDoc.accentColor = newDoc.accent_color;
          if ("status" in newDoc) mappedDoc.status = newDoc.status;
          if ("collaboration_enabled" in newDoc) mappedDoc.collaborationEnabled = newDoc.collaboration_enabled;
          if ("last_toggled_by" in newDoc) mappedDoc.lastToggledBy = newDoc.last_toggled_by;

          if (state.isCollabToggling && "collaborationEnabled" in mappedDoc) {
            delete mappedDoc.collaborationEnabled;
          }

          state.setFormMeta(mappedDoc);
        }
      )
      // Database: Watch active sessions
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_form_sessions", filter: `form_id=eq.${formId}` },
        () => {
          syncSessionsFromDB();
        }
      )
      // BROADCAST SOVEREIGNTY: We no longer listen to 'form_fields' table updates 
      // via Postgres Realtime while in collaboration mode. All field changes 
      // (locks, positions, content) are now 100% Broadcast-driven to avoid 
      // slow DB updates overwriting the fast UI state.
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      clearTimeout(broadcastThrottleTimer.current);
      clearTimeout(presenceDebounceTimer.current);
      clearTimeout(lockDebounceTimer.current);
    };
  }, [formId, currentUser.id, syncSessionsFromDB]);

  const broadcastCollabToggle = useCallback((enabled: boolean) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "COLLAB_TOGGLE",
      payload: { 
        type: "COLLAB_TOGGLE", 
        enabled,
        senderId: currentUser.id 
      },
    });
  }, [currentUser.id]);

  const trackMyPresence = useCallback((state: { selectedFieldId: string | null }) => {
    // 1. FAST PATH: Visual update for peers (Broadcast is already efficient)
    broadcastSelection(state.selectedFieldId);

    // 2. BACKGROUND: DB update (Debounced to 2s to reduce server load)
    clearTimeout(presenceDebounceTimer.current);
    presenceDebounceTimer.current = setTimeout(async () => {
      await pingActiveSession(
        formId,
        myPresenceKey,
        currentUser.id,
        currentUser.name,
        currentUser.email,
        myColor.current,
        state.selectedFieldId
      );
    }, 2000);
    
    // 3. LOCKS: DB update (Debounced to 500ms)
    clearTimeout(lockDebounceTimer.current);
    lockDebounceTimer.current = setTimeout(async () => {
      if (state.selectedFieldId && !state.selectedFieldId.startsWith("new:")) {
        await updateFieldLock(formId, state.selectedFieldId, currentUser.id);
      }
      
      // Release logic
      if (previousSelectedFieldId.current && previousSelectedFieldId.current !== state.selectedFieldId) {
        await updateFieldLock(formId, previousSelectedFieldId.current, null);
      }
      previousSelectedFieldId.current = state.selectedFieldId;
    }, 500);

  }, [formId, myPresenceKey, currentUser, myColor, broadcastSelection]);

  return {
    broadcastState,
    broadcastKick,
    trackMyPresence,
    broadcastCollabToggle,
    myColor: myColor.current,
    isSecondary,
    isReady,
    syncSessionsFromDB,
  };
}
