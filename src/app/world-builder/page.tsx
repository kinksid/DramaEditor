import { redirect } from "next/navigation";

/** 旧世界桌面入口已废弃，统一进入工作空间 */
export default function WorldBuilderPage() {
  redirect("/world-builder/worlds");
}
