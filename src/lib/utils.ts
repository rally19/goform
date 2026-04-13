import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSiteUrl() {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this in your .env file
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set on Vercel
    "http://localhost:3000";
  
  // Make sure to include `https://` when not localhost
  url = url.includes("http") ? url : `https://${url}`;
  
  // Remove trailing slash
  return url.replace(/\/$/, "");
}
