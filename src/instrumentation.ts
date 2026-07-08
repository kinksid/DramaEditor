export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapLlmPresets } = await import("@/lib/providers/llm/presets");
    await bootstrapLlmPresets();
  }
}
