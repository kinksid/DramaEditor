import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/worlds",
        destination: "/world-builder/worlds",
      },
      {
        source: "/worlds/:path*",
        destination: "/world-builder/worlds/:path*",
      },
      {
        source: "/stories/:storyId",
        destination: "/world-builder/stories/:storyId",
      },
    ];
  },
};

export default nextConfig;
