import type { NextConfig } from "next";

/** Vercel: tree-shake heavy icon/chart/animation packages (see optimizePackageImports) */
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
};

export default nextConfig;
