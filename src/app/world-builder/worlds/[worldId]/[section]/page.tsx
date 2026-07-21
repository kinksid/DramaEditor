import { notFound } from "next/navigation";
import { WorldDetailPage } from "@/components/world-builder/WorldDetailPage";

const sections = ["characters", "locations", "storylines"] as const;
type WorldSection = (typeof sections)[number];

export default async function WorldSectionPage({
  params,
}: {
  params: Promise<{ worldId: string; section: string }>;
}) {
  const { worldId, section } = await params;
  if (!sections.includes(section as WorldSection)) notFound();

  return (
    <WorldDetailPage worldId={worldId} section={section as WorldSection} />
  );
}
