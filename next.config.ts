import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide Next.js Dev Tools indicator (`nextjs-portal`) in local preview
  devIndicators: false,
  async rewrites() {
    return [
      { source: "/worlds", destination: "/world-builder/worlds" },
      { source: "/worlds/:worldId", destination: "/world-builder/stories/:worldId" },
      {
        source: "/worlds/:worldId/characters",
        destination: "/world-builder/worlds/:worldId/characters",
      },
      {
        source: "/worlds/:worldId/locations",
        destination: "/world-builder/worlds/:worldId/locations",
      },
      {
        source: "/worlds/:worldId/storylines",
        destination: "/world-builder/worlds/:worldId/storylines",
      },
      {
        source: "/worlds/:worldId/characters/:characterId",
        destination: "/world-builder/stories/:worldId/characters/:characterId",
      },
      {
        source: "/worlds/:worldId/locations/:locationId",
        destination: "/world-builder/stories/:worldId/locations/:locationId",
      },
      {
        source: "/worlds/:worldId/stories/:storyId",
        destination: "/world-builder/stories/:storyId",
      },
      { source: "/stories/:storyId", destination: "/world-builder/stories/:storyId" },
      {
        source: "/creator/profile/:userId",
        destination: "/world-builder/profile/:userId",
      },
      { source: "/account", destination: "/world-builder/account" },
      { source: "/help", destination: "/world-builder/help" },
      { source: "/partnership", destination: "/world-builder/partnership" },
      { source: "/home/taptv", destination: "/world-builder/inspire" },
      { source: "/pricing", destination: "/world-builder/tiers" },
    ];
  },
};

export default nextConfig;
