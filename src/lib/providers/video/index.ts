import { getProviderConfig } from "../config";
import type { VideoGenerateInput } from "../types";
import { submitComfyVideoTask } from "./comfyui";
import { submitSeedanceVideoTask } from "./seedance";

export async function submitVideoGeneration(
  input: VideoGenerateInput,
  meta?: { nodeId?: string },
) {
  const config = getProviderConfig();
  if (config.video.provider === "comfyui") {
    return submitComfyVideoTask(input, meta);
  }
  return submitSeedanceVideoTask(input, meta);
}

export { testComfyVideoConnection } from "./comfyui";
export { testSeedanceVideoConnection } from "./seedance";
