"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/client";
import { useFormBuilder, type CollaboratorInfo } from "./use-form-builder";
import type { BuilderField, BuilderForm } from "@/lib/form-types";

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

// ─── Broadcast event types ─────────────────────────────────────────────────────
export type BroadcastPayload =
  | { type: "FORM_UPDATE"; fields: BuilderField[]; form: Partial<BuilderForm>; senderId: string }
  | { type: "COLLAB_DISABLED"; senderId: string };

// ─── Presence payload type ─────────────────────────────────────────────────────
interface PresenceState {
  userId: string;
  name: string;
  email: string;
  color: string;
  /** fieldId they are currently selecting, or "__drag__" + fieldId while dragging */
  selectedFieldId: string | null;
}

// ─── Hook options ──────────────────────────────────────────────────────────────
export interface UseFormRealtimeOptions {
  formId: string;
  /** Presence is always on. This flag controls state-sync broadcast only. */
  broadcastEnabled: boolean;
  currentUser: { id: string; name: string; email: string };
  /** Called when we receive a COLLAB_DISABLED event from an admin. */
  onKicked: () => void;
}

export function useFormRealtime({
  formId,
  broadcastEnabled,
  currentUser,
  onKicked,
}: UseFormRealtimeOptions) {
  const { applyRemoteUpdate, setCollaborators, selectedFieldId } = useFormBuilder();

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const myColor = useRef(pickColor(currentUser.id));

  // ──────────────────────────────────────────────────────────────────────────────
  // Use refs for callbacks to avoid stale closures inside channel event handlers.
  // Channel event handlers are set up once and will use whatever value is in the ref.
  // ──────────────────────────────────────────────────────────────────────────────
  const applyRemoteUpdateRef = useRef(applyRemoteUpdate);
  applyRemoteUpdateRef.current = applyRemoteUpdate;

  const setCollaboratorsRef = useRef(setCollaborators);
  setCollaboratorsRef.current = setCollaborators;

  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;

  const broadcastEnabledRef = useRef(broadcastEnabled);
  broadcastEnabledRef.current = broadcastEnabled;

  // ─── Track my presence in the channel ─────────────────────────────────────
  const trackMyPresence = useCallback((state: Partial<PresenceState>) => {
    if (!channelRef.current) return;
    channelRef.current.track({
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      color: myColor.current,
      selectedFieldId: null,
      ...state,
    } satisfies PresenceState);
  }, [currentUser]);

  // ─── Process raw Supabase presence state → CollaboratorInfo[] ─────────────
  const processPresenceState = useCallback((rawState: Record<string, unknown[]>) => {
    const result: CollaboratorInfo[] = [];
    for (const [presenceKey, payloads] of Object.entries(rawState)) {
      // Supabase stores latest payload first
      const latest = (payloads as PresenceState[])[0];
      if (!latest || latest.userId === currentUser.id) continue;
      result.push({
        userId: latest.userId,
        name: latest.name,
        email: latest.email,
        color: latest.color,
        selectedFieldId: latest.selectedFieldId ?? null,
        presenceKey,
      });
    }
    // Use ref to avoid stale closure
    setCollaboratorsRef.current(result);
  }, [currentUser.id]);

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

  // ─── Channel subscription (always-on presence) ─────────────────────────────
  useEffect(() => {
    if (!currentUser.id || currentUser.id === "anon") return;

    const supabase = createClient();
    // One channel per form, always active while on the edit page
    const channel = supabase.channel(`form_builder_${formId}`, {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    channel
      // Presence sync (fires on initial connect and every change)
      .on("presence", { event: "sync" }, () => {
        processPresenceState(channel.presenceState() as Record<string, unknown[]>);
      })
      .on("presence", { event: "join" }, (_: unknown) => {
        processPresenceState(channel.presenceState() as Record<string, unknown[]>);
      })
      .on("presence", { event: "leave" }, (_: unknown) => {
        processPresenceState(channel.presenceState() as Record<string, unknown[]>);
      })
      // Broadcast: form updates (only applied when collab broadcast is enabled)
      .on("broadcast", { event: "FORM_UPDATE" }, ({ payload }: { payload: BroadcastPayload }) => {
        if (!broadcastEnabledRef.current) return;
        if (payload.type !== "FORM_UPDATE") return;
        if (payload.senderId === currentUser.id) return;
        applyRemoteUpdateRef.current({ fields: payload.fields, form: payload.form });
      })
      // Broadcast: collab disabled → kick non-senders
      .on("broadcast", { event: "COLLAB_DISABLED" }, ({ payload }: { payload: BroadcastPayload }) => {
        if (payload.type !== "COLLAB_DISABLED") return;
        if (payload.senderId === currentUser.id) return; // the one who turned it off stays
        onKickedRef.current();
      });

    channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          color: myColor.current,
          selectedFieldId: null,
        } satisfies PresenceState);
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setCollaboratorsRef.current([]);
    };
    // Only re-subscribe if formId or user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, currentUser.id, currentUser.name, currentUser.email]);

  // ─── Re-track presence whenever selectedFieldId changes ─────────────────────
  // (This is the key fix: runs on every selection change, uses latest channel ref)
  useEffect(() => {
    if (!channelRef.current) return;
    trackMyPresence({ selectedFieldId });
  }, [selectedFieldId, trackMyPresence]);

  return {
    broadcastState,
    broadcastKick,
    trackMyPresence,
    myColor: myColor.current,
  };
}
