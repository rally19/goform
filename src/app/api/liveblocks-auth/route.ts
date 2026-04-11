import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { db } from "@/db";
import { forms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyWorkspaceAccess } from "@/lib/actions/organizations";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const COLLAB_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f97316",
  "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899",
];

function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate with Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Get the room ID (form ID) from the request
    const { room } = await request.json();
    if (!room) {
      return new NextResponse("Missing room ID", { status: 400 });
    }

    // 3. Verify access to the form in the database
    const form = await db.query.forms.findFirst({
      where: eq(forms.id, room),
    });

    if (!form) {
      return new NextResponse("Form not found", { status: 404 });
    }

    const userId = user.id;
    let hasAccess = false;

    if (form.organizationId) {
      const access = await verifyWorkspaceAccess(form.organizationId, "editor");
      if (access.success) {
        hasAccess = true;
      }
    } else if (form.userId === userId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // 4. Start a Liveblocks session
    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Anonymous",
        avatar: user.user_metadata?.avatar_url ?? null,
        color: pickColor(userId),
      },
    });

    // 5. Authorize the user to the room
    // For simplicity, we allow full access to this specific room
    session.allow(room, session.FULL_ACCESS);

    // 6. Generate and return the session token
    const { status, body } = await session.authorize();
    return new NextResponse(body, { status });
  } catch (error) {
    console.error("Liveblocks Auth Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
