import type { CreationSession, WorldProject } from "@/types/worldBuilder";

export type SharedWorldBuilderState = {
  revision: number;
  updatedAt: string;
  lastClientId?: string;
  activeProjectId: string;
  projects: WorldProject[];
  creationSession: CreationSession;
};

export type SharedWorldBuilderPushBody = {
  expectedRevision: number;
  clientId: string;
  activeProjectId: string;
  projects: WorldProject[];
  creationSession: CreationSession;
};
