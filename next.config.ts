import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.88.*',       // Wildcard for entire subnet (if supported)
    '*.local',            // For .local domains (e.g., macbook.local)
  ],
 // output: "export",
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
