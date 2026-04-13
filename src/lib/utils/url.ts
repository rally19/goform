import { headers } from "next/headers";

/**
 * Dynamically gets the base URL (protocol + host) of the application.
 * This ensures that links generated in emails (invites, resets) match the current environment
 * (e.g., localhost:3000 vs formto.link) automatically.
 */
export async function getBaseUrl() {
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || "http";
    
    if (host) {
      return `${proto}://${host}`;
    }
  } catch (e) {
    // If headers() is called outside of a request context (e.g., background job),
    // it will throw. We fall back to environment variables.
    console.warn("getBaseUrl: headers() called outside of request context, falling back to env vars");
  }

  // Fallback to environment variables or local default
  return (
    process.env.NEXT_PUBLIC_SITE_URL || 
    process.env.NEXT_PUBLIC_APP_URL || 
    "http://localhost:3000"
  );
}
