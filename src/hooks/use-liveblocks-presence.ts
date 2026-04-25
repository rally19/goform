"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/client";
import { LiveList, LiveObject } from "@liveblocks/client";

type ActiveUser = {
  userId: string;
  name: string;
  color: string;
  presenceKey: string;
};

export function useLiveblocksPresence() {
  const [sessions, setSessions] = useState<Record<string, ActiveUser[]>>({});

  const refreshSessions = useCallback(async () => {
    try {
      const supabase = createClient();
      
      // Get all forms to check their Liveblocks rooms
      const { data: forms } = await supabase
        .from("forms")
        .select("id, title");

      if (!forms) return;

      const presenceMap: Record<string, ActiveUser[]> = {};

      // For each form, we'd need to check the Liveblocks room directly
      // Since we can't directly query Liveblocks rooms from client,
      // we'll use a different approach - monitor active rooms via subscriptions
      
      for (const form of forms) {
        // This will be populated when users are actually in the rooms
        presenceMap[form.id] = [];
      }

      setSessions(presenceMap);
    } catch (error) {
      console.error("Failed to refresh presence:", error);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  return sessions;
}

// Hook for a single form's presence (to be used in form builder)
export function useFormPresence(formId: string) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  // This would be implemented in the actual form builder component
  // using Liveblocks' useOthers hook directly
  
  return { activeUsers };
}
