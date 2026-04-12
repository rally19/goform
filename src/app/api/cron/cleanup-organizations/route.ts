import { db } from "@/db";
import { organizations } from "@/db/schema";
import { lte, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * ── VERCEL CRON JOB: CLEANUP ABANDONED ORGANIZATIONS ──
 * This job runs daily (or as configured in vercel.json) to permanently delete
 * organizations that have been without an owner for more than 30 days.
 */
export async function GET(request: Request) {
  // 1. Security check for Vercel Cron Secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find organizations abandoned for more than 7 days
    const abandonedOrgs = await db.query.organizations.findMany({
      where: lte(organizations.ownerDeletedAt, sevenDaysAgo),
    });

    if (abandonedOrgs.length === 0) {
      return NextResponse.json({ success: true, message: "No abandoned organizations to clean up" });
    }

    // Delete abandoned organizations
    const idsToDelete = abandonedOrgs.map((org) => org.id);
    
    for (const org of abandonedOrgs) {
      await db.delete(organizations).where(lte(organizations.id, org.id));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully cleaned up ${abandonedOrgs.length} abandoned organizations (7-day threshold)`,
      deletedIds: idsToDelete 
    });
  } catch (err) {
    console.error("Cleanup cron job failed:", err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
