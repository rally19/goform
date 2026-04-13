import { acceptInvite } from "@/lib/actions/organizations";
import { createClient } from "@/lib/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  // Check if authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login with the next parameter pointing back to this route
    const currentUrl = request.nextUrl;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${currentUrl.pathname}${currentUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const result = await acceptInvite(token);

  if (result.success) {
    // Redirect to the organization page
    const orgId = result.data?.organizationId;
    return NextResponse.redirect(new URL(`/organizations/${orgId}`, request.url));
  } else {
    // Basic error page or pass error message to a proper 404/error route
    return new NextResponse(result.error || "Failed to accept invite", { status: 400 });
  }
}
