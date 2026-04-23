import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts", "simple-icons"],
    instantNavigationDevToolsToggle: true,
    authInterrupts: true,
  },
};

export default nextConfig;
