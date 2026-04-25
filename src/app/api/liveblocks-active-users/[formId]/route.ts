import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { db } from "@/db";
import { forms, users, organizationMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { liveblocks } from "@/lib/liveblocks";

// Get active users for a specific Liveblocks room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;

    if (!formId) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 });
    }

    // Validate formId format to prevent injection
    if (typeof formId !== "string" || !/^[a-zA-Z0-9-_]+$/.test(formId)) {
      return NextResponse.json({ error: "Invalid form ID" }, { status: 400 });
    }

    // Check user role for admin access
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    const isAdmin = dbUser?.role === "admin" || dbUser?.role === "superadmin";

    // If not admin, check form access
    if (!isAdmin) {
      // Get form details
      const form = await db.query.forms.findFirst({
        where: eq(forms.id, formId),
        columns: { userId: true, organizationId: true },
      });

      if (!form) {
        return NextResponse.json({ error: "Form not found" }, { status: 404 });
      }

      // Check if user is the owner
      const isOwner = form.userId === user.id;

      // Check if user is member of the form's organization
      let isOrgMember = false;
      if (form.organizationId) {
        const orgMembership = await db.query.organizationMembers.findFirst({
          where: eq(organizationMembers.userId, user.id),
        });
        isOrgMember = !!orgMembership;
      }

      // Grant access if owner or org member
      if (!isOwner && !isOrgMember) {
        return NextResponse.json({ error: "Forbidden: You don't have access to this form" }, { status: 403 });
      }
    }

    // Get active users from Liveblocks room
    const activeUsersResponse = await liveblocks.getActiveUsers(formId);
    
    // Transform the response to match our expected format
    const activeUsers = activeUsersResponse.data?.map((user: any) => ({
      userId: user.id,
      name: user.info?.name || "Anonymous",
      color: user.info?.color || "#6366f1",
      presenceKey: user.id, // Use user ID as presence key
      avatarUrl: user.info?.picture || user.info?.avatar || null, // Check for avatar/picture field
    })) || [];

    return NextResponse.json({ 
      activeUsers,
      count: activeUsers.length 
    });

  } catch (error) {
    console.error("Failed to get active users:", error);
    // Room might not exist or be inaccessible
    return NextResponse.json({ 
      activeUsers: [], 
      count: 0 
    });
  }
}
