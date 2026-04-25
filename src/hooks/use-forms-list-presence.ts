"use client";

import { useState, useEffect, useCallback } from "react";

export type ActiveUser = {
  userId: string;
  name: string;
  color: string;
  presenceKey: string;
};

export function useFormListPresence(formIds: string[]) {
  const [sessions, setSessions] = useState<Record<string, ActiveUser[]>>({});

  const refreshSessions = useCallback(async () => {
    try {
      const presenceMap: Record<string, ActiveUser[]> = {};
      
      // Poll each form's Liveblocks room for active users
      for (const formId of formIds) {
        try {
          const response = await fetch(`/api/liveblocks-active-users/${formId}`);
          if (response.ok) {
            const data = await response.json();
            presenceMap[formId] = data.activeUsers || [];
          } else {
            presenceMap[formId] = [];
          }
        } catch (error) {
          // Room might not exist or be inaccessible
          presenceMap[formId] = [];
        }
      }
      
      setSessions(presenceMap);
    } catch (error) {
      console.error("Failed to refresh presence:", error);
    }
  }, [formIds]);

  useEffect(() => {
    if (formIds.length === 0) return;
    
    refreshSessions();
    
    // Poll every 30 seconds for presence updates
    const interval = setInterval(refreshSessions, 30000);
    return () => clearInterval(interval);
  }, [formIds, refreshSessions]);

  return sessions;
}
