import { useEffect } from "react";
import { createClient } from "@/lib/client";
import { mapFormUpdate } from "./use-form-realtime-utils";
import type { BuilderForm } from "@/lib/form-types";

import { RealtimePostgresUpdatePayload } from "@supabase/supabase-js";

/**
 * A hook that listens for real-time updates to a specific form's metadata.
 * Useful for settings pages, analytics, or any non-editor page that needs 
 * to stay in sync with the database.
 */
export function useFormSync(
  formId: string, 
  onUpdate: (changes: Partial<BuilderForm>) => void
) {
  useEffect(() => {
    if (!formId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`form_sync_${formId}`)
      .on(
        "postgres_changes" as any,
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "forms", 
          filter: `id=eq.${formId}` 
        },
        (payload: RealtimePostgresUpdatePayload<Record<string, any>>) => {
          const changes = mapFormUpdate(payload.new);
          onUpdate(changes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formId, onUpdate]);
}
