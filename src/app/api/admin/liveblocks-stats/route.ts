import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { adminProcedure } from "@/lib/admin-procedure";
import { liveblocks } from "@/lib/liveblocks";

// Get Liveblocks room statistics for admin monitoring
export async function GET(request: NextRequest) {
  try {
    // Verify admin permissions
    const authResult = await adminProcedure();
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all forms from database
    const supabase = await createClient();
    const { data: forms, error } = await supabase
      .from("forms")
      .select("id, title, slug, created_at");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!forms) {
      return NextResponse.json({ rooms: [], totalForms: 0, totalActiveUsers: 0 });
    }

    // Get statistics for each Liveblocks room
    const roomStats = [];
    let totalActiveUsers = 0;

    for (const form of forms) {
      try {
        // Get active users from Liveblocks room
        const activeUsersResponse = await liveblocks.getActiveUsers(form.id);
        const activeUsers = activeUsersResponse.data?.length || 0;
        
        totalActiveUsers += activeUsers;

        roomStats.push({
          formId: form.id,
          formTitle: form.title,
          formSlug: form.slug,
          createdAt: form.created_at,
          activeUsers,
          lastActivity: null, // Could be enhanced with room metadata if needed
        });
      } catch (roomError) {
        // Room might not exist or be inaccessible
        roomStats.push({
          formId: form.id,
          formTitle: form.title,
          formSlug: form.slug,
          createdAt: form.created_at,
          activeUsers: 0,
          lastActivity: null,
        });
      }
    }

    // Sort by active users (most active first)
    roomStats.sort((a, b) => b.activeUsers - a.activeUsers);

    return NextResponse.json({
      rooms: roomStats,
      totalForms: forms.length,
      totalActiveUsers,
      summary: {
        activeRooms: roomStats.filter(r => r.activeUsers > 0).length,
        mostActiveRoom: roomStats[0]?.activeUsers || 0,
      }
    });

  } catch (error) {
    console.error("Failed to get Liveblocks stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch room statistics" },
      { status: 500 }
    );
  }
}
