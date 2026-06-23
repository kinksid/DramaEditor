"use client";

import { Sidebar } from "@/components/world-builder/Sidebar";
import { WorldAgentPanel } from "@/components/world-builder/WorldAgentPanel";

type Props = {
  children: React.ReactNode;
  agentMode?: "world" | "setup" | "graph" | "none";
};

export function WorldBuilderLayout({ children, agentMode = "world" }: Props) {
  return (
    <div className="flex min-h-screen bg-stage text-ink">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      {agentMode !== "none" && <WorldAgentPanel mode={agentMode} />}
    </div>
  );
}
