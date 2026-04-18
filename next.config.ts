import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
    instantNavigationDevToolsToggle: true,
    authInterrupts: true,
  },
};

export default nextConfig;
