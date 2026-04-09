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
      })
      .onConflictDoUpdate({
        target: activeFormSessions.id,
        set: {
          selectedFieldIdText,
          lastPing: new Date(),
        },
      });

    // Automatically clean up stale sessions (older than 10 seconds)
    const tenSecondsAgo = new Date(Date.now() - 10000);
    await db.delete(activeFormSessions).where(lt(activeFormSessions.lastPing, tenSecondsAgo));

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

export async function getActiveSessions(formId: string) {
  try {
    const user = await getAuthUser();
    if (!user) return { success: false, data: [] };

    const tenSecondsAgo = new Date(Date.now() - 10000);
    
    // Automatically delete stale so we don't query ghosts
    await db.delete(activeFormSessions).where(lt(activeFormSessions.lastPing, tenSecondsAgo));

    const sessions = await db.query.activeFormSessions.findMany({
      where: eq(activeFormSessions.formId, formId),
      orderBy: (table, { desc }) => [desc(table.lastPing)],
    });
    
    return { success: true, data: sessions };
  } catch (error) {
    return { success: false, data: [] };
  }
}
