import { getProviderConfig } from "../config";
import type { ImageGenerateInput } from "../types";
import { submitComfyImageTask } from "./comfyui";
import { submitSeedanceImageTask } from "./seedance";

export async function submitImageGeneration(
  input: ImageGenerateInput,
  meta?: {
    nodeId?: string;
    targetField?: string;
    targetEntityId?: string;
    entityType?: "character" | "location";
  },
) {
  const config = getProviderConfig();
  if (config.image.provider === "seedance") {
    return submitSeedanceImageTask(input, meta);
  }
  return submitComfyImageTask(input, meta);
}

export { analyzeImageWithComfy, testComfyCharacterConnection, testComfyImageConnection } from "./comfyui";
export { testSeedanceImageConnection } from "./seedance";
