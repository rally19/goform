import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverActions: {
    bodySizeLimit: '5mb',
  },
};

export default nextConfig;
