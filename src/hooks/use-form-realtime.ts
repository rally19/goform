"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/client";
import { useFormBuilder, type CollaboratorInfo } from "./use-form-builder";
import type { BuilderField, BuilderForm } from "@/lib/form-types";

// ─── Collaborator colors (assigned per user, consistent per session) ──────────
const COLLAB_COLORS = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f97316", // orange
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
];

function pickColor(userId: string): string {
  // Stable color based on user id hash
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export { getInitials, pickColor };

// ─── Broadcast event types ─────────────────────────────────────────────────────
type BroadcastPayload =
  | { type: "FORM_UPDATE"; fields: BuilderField[]; form: Partial<BuilderForm>; senderId: string }
  | { type: "FIELD_SELECT"; fieldId: string | null; senderId: string };

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseFormRealtimeOptions {
  formId: string;
  enabled: boolean;
  currentUser: { id: string; name: string; email: string };
  /** Called when we should broadcast current state (after a local change) */
  onBroadcastState: () => void;
}

export function useFormRealtime({
  formId,
  enabled,
  currentUser,
  onBroadcastState,
}: UseFormRealtimeOptions) {
  const { applyRemoteUpdate, setCollaborators, fields, form, selectedFieldId } = useFormBuilder();

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const myColor = useRef(pickColor(currentUser.id));
  const myPresenceKey = useRef<string | null>(null);

  // ─── Build presence payload ────────────────────────────────────────────────
  const buildMyPresence = useCallback(
    (overrideFieldId?: string | null) => ({
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      color: myColor.current,
      selectedFieldId: overrideFieldId !== undefined ? overrideFieldId : selectedFieldId,
    }),
    [currentUser, selectedFieldId]
  );

  // ─── Broadcast current form state to peers ─────────────────────────────────
  const broadcastState = useCallback(
    (fieldsSnapshot: BuilderField[], formSnapshot: Partial<BuilderForm>) => {
      if (!channelRef.current || !enabled) return;
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
    [currentUser.id, enabled]
  );

  // ─── Update presence when selected field changes ────────────────────────────
  const trackPresence = useCallback(
    (fieldId: string | null) => {
      if (!channelRef.current || !enabled) return;
      channelRef.current.track(buildMyPresence(fieldId));
    },
    [buildMyPresence, enabled]
  );

  // ─── Process raw presence state into CollaboratorInfo[] ────────────────────
  const processPresenceState = useCallback(
    (state: Record<string, unknown[]>) => {
      const result: CollaboratorInfo[] = [];
      for (const [presenceKey, payloads] of Object.entries(state)) {
        const latest = (payloads as Record<string, unknown>[])[0];
        if (!latest || (latest.userId as string) === currentUser.id) continue;
        result.push({
          userId: latest.userId as string,
          name: latest.name as string,
          email: latest.email as string,
          color: latest.color as string,
          selectedFieldId: (latest.selectedFieldId as string | null) ?? null,
          presenceKey,
        });
      }
      setCollaborators(result);
    },
    [currentUser.id, setCollaborators]
  );

  // ─── Subscribe / Unsubscribe ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      // Clean up if collab is turned off
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
        setCollaborators([]);
      }
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`form_builder_${formId}`, {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    // ─── Presence events ────────────────────────────────────────────────────
    channel
      .on("presence", { event: "sync" }, () => {
        processPresenceState(channel.presenceState() as Record<string, unknown[]>);
      })
      .on("presence", { event: "join" }, ({ newPresences }: { newPresences: unknown[] }) => {
        // Re-sync on join; avoid stale state
        processPresenceState(channel.presenceState() as Record<string, unknown[]>);
        console.debug("[Collab] User joined:", newPresences);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }: { leftPresences: unknown[] }) => {
        processPresenceState(channel.presenceState() as Record<string, unknown[]>);
        console.debug("[Collab] User left:", leftPresences);
      });

    // ─── Broadcast events ────────────────────────────────────────────────────
    channel.on("broadcast", { event: "FORM_UPDATE" }, ({ payload }: { payload: BroadcastPayload }) => {
      const p = payload as BroadcastPayload;
      if (p.type !== "FORM_UPDATE") return;
      if (p.senderId === currentUser.id) return; // ignore own echoes

      applyRemoteUpdate({ fields: p.fields, form: p.form });
    });

    // ─── Subscribe ───────────────────────────────────────────────────────────
    channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await channel.track(buildMyPresence());
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setCollaborators([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, formId, currentUser.id]);

  // ─── Track presence when selectedFieldId changes ───────────────────────────
  useEffect(() => {
    if (!enabled || !channelRef.current) return;
    trackPresence(selectedFieldId);
  }, [selectedFieldId, enabled, trackPresence]);

  return {
    broadcastState,
    trackPresence,
    myColor: myColor.current,
  };
}
