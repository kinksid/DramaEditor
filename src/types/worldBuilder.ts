export type World = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  genre: string[];
  tags: string[];
  coverImage?: string;
  createdAt: string;
};

export type Character = {
  id: string;
  name: string;
  age?: number;
  role: string;
  description: string;
  referenceImage?: string;
};

export type Location = {
  id: string;
  name: string;
  type: "Establishing" | "Master" | "Temporary";
  description: string;
  referenceImage?: string;
};

export type Episode = {
  id: string;
  index: number;
  label?: string;
  title: string;
  description?: string;
};

export type SceneNodeData = {
  id: string;
  episodeId: string;
  title: string;
  prompt: string;
  videoUrl?: string;
  firstFrameRef?: string;
  status: "empty" | "draft" | "generating" | "ready" | "failed";
};

export type InteractionOption = {
  id: string;
  label: string;
  actionType: "tap" | "swipe" | "hold" | "rapidTap" | "choice";
  actionValue?: string;
  targetNodeId?: string;
  color?: string;
  hotspot?: {
    x: number;
    y: number;
  };
};

export type InteractionNodeData = {
  id: string;
  episodeId: string;
  title: string;
  instruction: string;
  loopVideoUrl?: string;
  firstFrameRef?: string;
  lastFrameRef?: string;
  options: InteractionOption[];
};

export type EndingNodeData = {
  id: string;
  episodeId: string;
  title: string;
  endingType: "good" | "bad" | "normal" | "secret";
  description: string;
};

export type StoryNodeKind = "scene" | "interaction" | "ending";

export type CanvasPosition = {
  x: number;
  y: number;
};

export type StoryNode =
  | { id: string; kind: "scene"; data: SceneNodeData; position?: CanvasPosition }
  | { id: string; kind: "interaction"; data: InteractionNodeData; position?: CanvasPosition }
  | { id: string; kind: "ending"; data: EndingNodeData; position?: CanvasPosition };

export type StoryEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  actionType?: InteractionOption["actionType"] | "ending";
};

export type SetupDraft = {
  worldTitle: string;
  genre: string;
  tags: string;
  worldDescription: string;
  tone: string;
  visualStyle: string;
  script: string;
};

export type StoryValidationIssue = {
  id: string;
  severity: "error" | "warning";
  title: string;
  detail: string;
  nodeId?: string;
  episodeId?: string;
};

export type ThirdPartyWorkflowTarget = "tapnow" | "libtv";
