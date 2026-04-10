"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/client";
import { useFormBuilder, type CollaboratorInfo } from "./use-form-builder";
import type { BuilderField, BuilderForm } from "@/lib/form-types";
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
  | { type: "SELECTION_CHANGE"; userId: string; fieldId: string | null; senderId: string };

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
    const earlierSessions = mySession 
      ? allSessions.filter(s => new Date(s.joinedAt) < new Date(mySession.joinedAt))
      : [];
    
    // If there is ANYONE else who joined before us, we are secondary
    setIsSecondary(earlierSessions.length > 0);

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
    if (!channelRef.current || !broadcastEnabledRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "SELECTION_CHANGE",
      payload: {
        type: "SELECTION_CHANGE",
        userId: currentUser.id,
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

  // ─── Broadcast form state update to peers ─────────────────────────────────
  const broadcastState = useCallback(
    (fieldsSnapshot: BuilderField[], formSnapshot: Partial<BuilderForm>) => {
      if (!channelRef.current || !broadcastEnabledRef.current) return;
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
        applyRemoteUpdateRef.current({ fields: payload.fields, form: payload.form });
      })
      // Broadcast: collab disabled → show overlay (don't kick)
      .on("broadcast", { event: "COLLAB_DISABLED" }, ({ payload }: { payload: BroadcastPayload }) => {
        if (payload.type !== "COLLAB_DISABLED") return;
        if (payload.senderId === currentUser.id) return; 
        
        // Immediately enforce the lock locally to prevent stale auto-saves that might
        // overwrite the master state back to True before the DB listener catches up.
        useFormBuilder.getState().setFormMeta({ collaborationEnabled: false });
      })
      // Broadcast: selection change (Fast Path)
      .on("broadcast", { event: "SELECTION_CHANGE" }, ({ payload }: { payload: BroadcastPayload }) => {
        if (payload.type !== "SELECTION_CHANGE") return;
        if (payload.senderId === currentUser.id) return;
        useFormBuilder.getState().updateCollaboratorSelection(payload.userId, payload.fieldId);
      })
      // Database: Watch form metadata changes (Collaboration toggle, Accent color, etc.)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "forms", filter: `id=eq.${formId}` },
        (payload: Record<string, any>) => {
          const newDoc = payload.new as Record<string, any>;
          const mappedDoc: Partial<BuilderForm> = {};
          
          if ("title" in newDoc) mappedDoc.title = newDoc.title;
          if ("description" in newDoc) mappedDoc.description = newDoc.description;
          if ("status" in newDoc) mappedDoc.status = newDoc.status;
          if ("accent_color" in newDoc) mappedDoc.accentColor = newDoc.accent_color;
          if ("accept_responses" in newDoc) mappedDoc.acceptResponses = newDoc.accept_responses;
          if ("require_auth" in newDoc) mappedDoc.requireAuth = newDoc.require_auth;
          if ("show_progress" in newDoc) mappedDoc.showProgress = newDoc.show_progress;
          if ("one_response_per_user" in newDoc) mappedDoc.oneResponsePerUser = newDoc.one_response_per_user;
          if ("success_message" in newDoc) mappedDoc.successMessage = newDoc.success_message;
          if ("redirect_url" in newDoc) mappedDoc.redirectUrl = newDoc.redirect_url;
          if ("auto_save" in newDoc) mappedDoc.autoSave = newDoc.auto_save;
          if ("collaboration_enabled" in newDoc) mappedDoc.collaborationEnabled = newDoc.collaboration_enabled;

          useFormBuilder.getState().setFormMeta(mappedDoc);
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
      // Database: Watch form fields locks
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "form_fields", filter: `form_id=eq.${formId}` },
        (payload: Record<string, any>) => {
          const newRow = payload.new as { id: string; locked_by: string | null };
          // Inject the lock state into our local fields list WITHOUT marking as dirty
          useFormBuilder.getState().setFieldLock(newRow.id, newRow.locked_by);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [formId, currentUser.id, syncSessionsFromDB]);

  // We no longer have a trackMyPresence that pushes to channel presence. 
  // It's all managed by the Database updates now. However, for dragging:
  const trackMyPresence = useCallback(async (state: { selectedFieldId: string | null }) => {
    // FAST PATH: Visual update for peers
    broadcastSelection(state.selectedFieldId);

    // BACKGROUND: DB update
    await pingActiveSession(
      formId,
      myPresenceKey,
      currentUser.id,
      currentUser.name,
      currentUser.email,
      myColor.current,
      state.selectedFieldId
    );
    
    if (state.selectedFieldId) {
      if (!state.selectedFieldId.startsWith("new:")) {
        await updateFieldLock(formId, state.selectedFieldId, currentUser.id);
      }
    } else if (previousSelectedFieldId.current) {
      // Clear lock on the previous one if we are releasing it
      await updateFieldLock(formId, previousSelectedFieldId.current, null);
    }
  }, [formId, myPresenceKey, currentUser, myColor, broadcastSelection]);

  return {
    broadcastState,
    broadcastKick,
    trackMyPresence,
    myColor: myColor.current,
    isSecondary,
    isReady,
  };
}
