"use server";

import { db } from "@/db";
import { users, forms, organizations, formResponses } from "@/db/schema";
import { count, gte, sql, eq, desc } from "drizzle-orm";
import { assertAdmin } from "./utils";

/**
 * Fetches high-level system statistics for the admin dashboard.
 */
export async function adminGetStats() {
  try {
    await assertAdmin();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      [usersCount],
      [formsCount],
      [orgsCount],
      [responsesCount],
      dailyUsers,
      dailyResponses,
      roleDistribution,
      statusDistribution,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(forms),
      db.select({ count: count() }).from(organizations),
      db.select({ count: count() }).from(formResponses),
      
      // Daily Users (last 30 days)
      db.select({
        date: sql<string>`DATE(${users.createdAt})::text`,
        count: count()
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`),

      // Daily Responses (last 30 days)
      db.select({
        date: sql<string>`DATE(${formResponses.submittedAt})::text`,
        count: count()
      })
      .from(formResponses)
      .where(gte(formResponses.submittedAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${formResponses.submittedAt})`)
      .orderBy(sql`DATE(${formResponses.submittedAt})`),

    // Role Distribution
      db.select({
        name: users.role,
        value: count()
      })
      .from(users)
      .groupBy(users.role),

      // Status Distribution
      db.select({
        name: forms.status,
        value: count()
      })
      .from(forms)
      .groupBy(forms.status),
    ]);

    // Pad missing dates for the last 30 days
    const padData = (data: { date: string; count: number }[]) => {
      const padded = [];
      const now = new Date();
      // Use local date to match the DATE() function in DB if possible, 
      // but DB is likely UTC. Let's stick to a consistent approach.
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const existing = data.find(item => item.date === dateStr);
        padded.push({
          date: dateStr,
          count: existing ? Number(existing.count) : 0
        });
      }
      return padded;
    };

    return {
      success: true,
      data: {
        users: usersCount.count,
        forms: formsCount.count,
        organizations: orgsCount.count,
        responses: responsesCount.count,
        timeSeries: {
          users: padData(dailyUsers),
          responses: padData(dailyResponses),
        },
        distributions: {
          roles: roleDistribution,
          statuses: statusDistribution,
        },
      },
    };
  } catch (err) {
    console.error("adminGetStats error:", err);
    return { success: false, error: (err as Error).message };
  }
}
