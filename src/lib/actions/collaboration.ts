"use server";

import { db } from "@/db";
import { formFields, activeFormSessions } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { createClient } from "@/lib/server";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function pingActiveSession(
  formId: string,
  presenceKey: string,
  userId: string,
  name: string,
  email: string,
  color: string,
  selectedFieldIdText: string | null
) {
  try {
    const user = await getAuthUser();
    // Only proceed if authenticated correctly
    if (!user || user.id !== userId) return { success: false, error: "Unauthorized" };

    const sessionId = `${formId}_${presenceKey}`;

    // Upsert the session heartbeat
    await db
      .insert(activeFormSessions)
      .values({
        id: sessionId,
        formId,
        userId,
        presenceKey,
        name,
        email,
        color,
        selectedFieldIdText,
        joinedAt: new Date(), // Set on initial insert
      })
      .onConflictDoUpdate({
        target: activeFormSessions.id,
        set: {
          selectedFieldIdText,
          lastPing: new Date(),
          // joinedAt is NOT updated on conflict, preserving original join time
        },
      });

    // Automatically clean up stale sessions (older than 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    await db.delete(activeFormSessions).where(lt(activeFormSessions.lastPing, thirtySecondsAgo));

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function removeActiveSession(formId: string, presenceKey: string) {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false };

    const sessionId = `${formId}_${presenceKey}`;
    await db.delete(activeFormSessions).where(eq(activeFormSessions.id, sessionId));

    // Release any field locked by this user exactly
    await db
      .update(formFields)
      .set({ lockedBy: null })
      .where(and(eq(formFields.formId, formId), eq(formFields.lockedBy, user.id)));

    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function updateFieldLock(formId: string, fieldId: string, lockValue: string | null) {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Set locked_by to either the current user (if claiming) or null.
    // Safety check: if lockValue is null, ensure it's currently locked by THIS user.
    if (lockValue === null) {
      await db
        .update(formFields)
        .set({ lockedBy: null })
        .where(
          and(
            eq(formFields.id, fieldId),
            eq(formFields.formId, formId),
            eq(formFields.lockedBy, user.id)
          )
        );
    } else {
      await db
        .update(formFields)
        .set({ lockedBy: lockValue })
        .where(
          and(
            eq(formFields.id, fieldId),
            eq(formFields.formId, formId)
          )
        );
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function getActiveSessions(formId?: string) {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, data: [] };

    const filters = [];
    if (formId) {
      filters.push(eq(activeFormSessions.formId, formId));
    }

    const sessions = await db.query.activeFormSessions.findMany({
      where: filters.length > 0 ? and(...filters) : undefined,
      orderBy: (table, { asc }) => [asc(table.joinedAt)],
    });
    
    return { success: true, data: sessions };
  } catch (error) {
    return { success: false, data: [] };
  }
}
