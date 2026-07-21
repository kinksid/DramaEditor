import { WorldDetailPage } from "@/components/world-builder/WorldDetailPage";

export default async function WorldPage({
  params,
}: {
  params: Promise<{ worldId: string }>;
}) {
  const { worldId } = await params;
  return <WorldDetailPage worldId={worldId} />;
}
