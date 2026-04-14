import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://192.168.0.101:3000"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
