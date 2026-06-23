import type { InteractionOption, Location, SceneNodeData } from "@/types/worldBuilder";

export const statusLabels: Record<SceneNodeData["status"], string> = {
  empty: "空",
  draft: "草稿",
  generating: "生成中",
  ready: "已就绪",
  failed: "失败",
};

export const locationTypeLabels: Record<Location["type"], string> = {
  Establishing: "建立镜头",
  Master: "主场景",
  Temporary: "临时场景",
};

export const actionTypeLabels: Record<InteractionOption["actionType"], string> = {
  tap: "点击",
  swipe: "滑动",
  hold: "长按",
  rapidTap: "连续点击",
  choice: "选择",
};
