"use server";

import { db } from "@/db";
import { users, forms, organizations, formResponses } from "@/db/schema";
import { count } from "drizzle-orm";
import { assertAdmin } from "./utils";

/**
 * Fetches high-level system statistics for the admin dashboard.
 */
export async function adminGetStats() {
  try {
    await assertAdmin();

    const [
      [usersCount],
      [formsCount],
      [orgsCount],
      [responsesCount],
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(forms),
      db.select({ count: count() }).from(organizations),
      db.select({ count: count() }).from(formResponses),
    ]);

    return {
      success: true,
      data: {
        users: usersCount.count,
        forms: formsCount.count,
        organizations: orgsCount.count,
        responses: responsesCount.count,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
