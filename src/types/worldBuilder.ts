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

export type CharacterChatConfig = {
  /** Enable Dreem-style post-story character chat for this role */
  enabled: boolean;
  /** In-character speaking style / personality for chat */
  personality: string;
  /** Memory hooks the chat agent should remember */
  memoryHooks: string;
  /** Relationship goals with the player */
  relationshipGoals: string;
};

export type CharacterProfile = {
  tagline?: string;
  gender?: string;
  ethnicity?: string;
  personality?: string;
  profession?: string;
  voiceStyle?: string;
  catchphrase?: string;
  neverSays?: string;
  habits?: string;
  era?: string;
  society?: string;
  vibe?: string;
  homeBase?: string;
  form?: string;
  skin?: string;
  face?: string;
  eyes?: string;
  hair?: string;
  looksLike?: string;
  distinguishingMark?: string;
  /** @deprecated prefer figure/height/movement/bodyMark */
  body?: string;
  figure?: string;
  height?: string;
  movement?: string;
  bodyMark?: string;
  /** @deprecated prefer silhouette/palette/materials/signaturePiece */
  wardrobe?: string;
  silhouette?: string;
  palette?: string;
  materials?: string;
  signaturePiece?: string;
  others?: string;
};

export type Character = {
  id: string;
  name: string;
  age?: number;
  role: string;
  description: string;
  referenceImage?: string;
  previewImage?: string;
  turnaroundImages?: string[];
  profile?: CharacterProfile;
  chat?: CharacterChatConfig;
};

export type LocationProfile = {
  placement?: string;
  era?: string;
  materials?: string;
  timeOfDay?: string;
  light?: string;
  atmosphere?: string;
  iconicDetail?: string;
  others?: string;
};

export type Location = {
  id: string;
  name: string;
  type: "Establishing" | "Master" | "Temporary";
  description: string;
  referenceImage?: string;
  angleImages?: string[];
  profile?: LocationProfile;
};

export type EpisodeFrameRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Episode = {
  id: string;
  index: number;
  label?: string;
  title: string;
  description?: string;
  /** 高光剧集（大纲/画布星标） */
  highlight?: boolean;
  /** 剧集框手动位置/尺寸；缺省时按子节点自动包住 */
  frame?: EpisodeFrameRect;
};

export type GenerationHistoryEntry = {
  id: string;
  kind: "image" | "video";
  provider: string;
  prompt: string;
  url: string;
  createdAt: string;
};

export type SceneNodeData = {
  id: string;
  episodeId: string;
  title: string;
  prompt: string;
  clipKind?: "scene" | "highlight";
  videoUrl?: string;
  firstFrameRef?: string;
  lastFrameRef?: string;
  /** 生成参数（UI） */
  videoModel?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  durationSec?: 4 | 5 | 8;
  mentionedCharacterIds?: string[];
  mentionedLocationIds?: string[];
  status: "empty" | "draft" | "generating" | "ready" | "failed";
  generationHistory?: GenerationHistoryEntry[];
  activeGenerationTaskId?: string;
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
  videoModel?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  durationSec?: 4 | 5 | 8;
  mentionedCharacterIds?: string[];
  mentionedLocationIds?: string[];
  options: InteractionOption[];
  generationHistory?: GenerationHistoryEntry[];
  activeGenerationTaskId?: string;
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
  /** Interaction 节点上对应 option 的 Handle id */
  sourceHandle?: string;
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

export type ReferenceKind = "image" | "video" | "text";

export type CreationReference = {
  id: string;
  kind: ReferenceKind;
  name: string;
  url?: string;
  textContent?: string;
  mimeType?: string;
  analysisSummary?: string;
};

export type DecomposeWorldview = {
  worldTitle: string;
  genre: string;
  tags: string;
  tone: string;
  visualStyle: string;
  worldDescription: string;
};

export type DecomposeResult = {
  worldview: DecomposeWorldview;
  characters: Omit<Character, "id">[];
  locations: Omit<Location, "id">[];
  script: string;
};

export type DecomposePreviewMode = "worldview" | "characters" | "script" | "all";

export type WorldProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** 最近打开 / 退出编辑器的时间；工作空间「最近的项目」与首页继续工作据此排序 */
  lastOpenedAt?: string;
  setupDraft: SetupDraft;
  characters: Character[];
  locations: Location[];
  episodes: Episode[];
  nodes: StoryNode[];
  edges: StoryEdge[];
  world: World;
  references: CreationReference[];
  decomposeStatus?: "idle" | "running" | "done" | "error";
  decomposeError?: string;
};

export type CreationSession = {
  prompt: string;
  visualStylePreset?: string;
  references: CreationReference[];
  lastDecompose?: DecomposeResult;
};
