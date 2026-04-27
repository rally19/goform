import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { adminProcedure } from "@/lib/admin-procedure";

export async function GET() {
  try {
    const auth = await adminProcedure();
    if (!auth.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run a simple query to check the connection
    const result = await db.execute(sql`SELECT NOW() as now`);
    
    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("Drizzle connection test failed:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
