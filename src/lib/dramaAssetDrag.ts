export type DramaAssetKind =
  | "video"
  | "character"
  | "location"
  | "scene-template"
  | "interaction";

export type DramaAssetPayload = {
  kind: DramaAssetKind;
  title?: string;
  prompt?: string;
  instruction?: string;
  videoUrl?: string;
  poster?: string;
  characterId?: string;
  locationId?: string;
  referenceImage?: string;
  /** 已有节点：拖到画布时移动归属/位置，而不是新建 */
  nodeId?: string;
};

export const DRAMA_ASSET_MIME = "application/drama-asset";

export function serializeDramaAsset(payload: DramaAssetPayload): string {
  return JSON.stringify(payload);
}

export function parseDramaAsset(raw: string | undefined | null): DramaAssetPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DramaAssetPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDramaAssetDragData(
  dataTransfer: DataTransfer,
  payload: DramaAssetPayload,
): void {
  const raw = serializeDramaAsset(payload);
  dataTransfer.setData(DRAMA_ASSET_MIME, raw);
  dataTransfer.setData("text/plain", payload.title ?? payload.kind);
  dataTransfer.effectAllowed = "copy";
}
