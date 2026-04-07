import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
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
