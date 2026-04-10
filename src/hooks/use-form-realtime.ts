"use client";

import { useEffect, useRef, useCallback } from "react";
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
  | { type: "COLLAB_DISABLED"; senderId: string };

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

  // ─── Database Sync Handlers ────────────────────────────────────────────────
  
  const syncSessionsFromDB = useCallback(async () => {
    const res = await getActiveSessions(formId);
    if (!res.success || !res.data) return;
    
    const result: CollaboratorInfo[] = [];
    for (const s of res.data) {
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

  // Handle locking a specific field instantly when selectedFieldId changes
  useEffect(() => {
    const current = selectedFieldId;
    const prev = previousSelectedFieldId.current;
    
    if (prev && prev !== current) {
      updateFieldLock(formId, prev, null); // Unlock old
    }
    if (current && !current.startsWith("new:")) {
      updateFieldLock(formId, current, currentUser.id); // Lock new
    }
    
    previousSelectedFieldId.current = current;
    
    // Also ping instantly to let others know we selected something
    pingActiveSession(
      formId,
      myPresenceKey,
      currentUser.id,
      currentUser.name,
      currentUser.email,
      myColor.current,
      current
    );
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
      // Broadcast: form updates
      .on("broadcast", { event: "FORM_UPDATE" }, ({ payload }: { payload: BroadcastPayload }) => {
        if (!broadcastEnabledRef.current) return;
        if (payload.type !== "FORM_UPDATE") return;
        if (payload.senderId === currentUser.id) return;
        applyRemoteUpdateRef.current({ fields: payload.fields, form: payload.form });
      })
      // Broadcast: collab disabled → kick non-senders
      .on("broadcast", { event: "COLLAB_DISABLED" }, ({ payload }: { payload: BroadcastPayload }) => {
        if (payload.type !== "COLLAB_DISABLED") return;
        if (payload.senderId === currentUser.id) return; 
        onKickedRef.current();
      })
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
    } else {
      // Clear lock on the previous one if we are releasing it
      if (previousSelectedFieldId.current) {
        await updateFieldLock(formId, previousSelectedFieldId.current, null);
      }
    }
  }, [formId, myPresenceKey, currentUser, myColor]);

  return {
    broadcastState,
    broadcastKick,
    trackMyPresence,
    myColor: myColor.current,
  };
}
