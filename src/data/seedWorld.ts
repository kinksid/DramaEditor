import type {
  Character,
  Episode,
  Location,
  SetupDraft,
  StoryEdge,
  StoryNode,
  World,
} from "@/types/worldBuilder";

export const seedWorld: World = {
  id: "world-neon-tokyo-noir",
  title: "霓虹东京迷案",
  subtitle: "记忆盗窃侦探惊悚故事",
  description:
    "在雨夜笼罩、极度数字化的东京，一名侦探追捕能够直接从受害者脑中偷走记忆的神秘盗贼。",
  genre: ["科幻", "悬疑", "剧情"],
  tags: ["赛博朋克", "记忆盗窃", "东京", "黑色电影"],
  createdAt: "2026-06-23",
};

export const seedCharacters: Character[] = [
  {
    id: "char-detective",
    name: "侦探",
    age: 38,
    role: "主角",
    description: "一名疲惫的私家侦探，脑内记忆植入体已经损坏。",
  },
  {
    id: "char-memory-thief",
    name: "记忆盗贼",
    age: 30,
    role: "反派",
    description:
      "一个神秘罪犯，专门盗取并交易人类记忆。",
  },
];

export const seedLocations: Location[] = [
  {
    id: "loc-tokyo-streets",
    name: "霓虹雨夜东京街头",
    type: "Establishing",
    description: "被雨水浸透的小巷、全息招牌和无尽的人潮。",
  },
  {
    id: "loc-memory-market",
    name: "记忆黑市",
    type: "Master",
    description:
      "隐藏在柏青哥店深处的非法交易场，摆满记忆读取机器。",
  },
  {
    id: "loc-precinct",
    name: "侦探据点",
    type: "Master",
    description:
      "一间安静的办公室，堆满案件资料、破损屏幕和冷掉的咖啡。",
  },
];

export const seedEpisodes: Episode[] = [
  { id: "ep1", index: 1, label: "1", title: "雨中幽灵" },
  { id: "ep2", index: 2, label: "2a", title: "没有信号的脸" },
  { id: "ep2b", index: 2, label: "2b", title: "分支剧情" },
  { id: "ep3", index: 3, label: "3", title: "自我残留" },
  { id: "ep4", index: 4, label: "4", title: "黎明陷阱" },
];

export const defaultScript = `淡入：

第一场

外景，东京新宿，夜。

雨像银色帘幕一样砸在街面。全息汉字广告把霓虹色彩洇进黑色水洼，街道像一条被城市记忆污染的河。

人潮之中，村上健司，38 岁，长风衣，帽檐压低，左眼是一枚哑灰色义眼植入体。他逆着人流前进，像是在自己的脑海里逆流游泳。

KENJI（旁白）
东京从不入睡。过去也一样。诀窍是分清到底是谁在说谎。

他停在一间拉面摊前，扫描一条只有他能看见的记忆残迹。`;

export const seedSetupDraft: SetupDraft = {
  worldTitle: seedWorld.title,
  genre: seedWorld.genre.join(", "),
  tags: seedWorld.tags.join(", "),
  worldDescription: seedWorld.description,
  tone: "阴郁、精确、偏执",
  visualStyle: "雨夜赛博朋克黑色电影，室内带温暖琥珀色光线",
  script: defaultScript,
};

export const seedStoryNodes: StoryNode[] = [
  {
    id: "ep1-scene-1",
    kind: "scene",
    data: {
      id: "ep1-scene-1",
      episodeId: "ep1",
      title: "新宿雨夜 - 追猎开始",
      status: "draft",
      prompt:
        "镜头从霓虹雨夜的东京街面开始，低机位贴近水洼，湿漉漉的柏油路像黑色镜面，反射出品红与电蓝色全息招牌。",
    },
  },
  {
    id: "ep1-interaction-1",
    kind: "interaction",
    data: {
      id: "ep1-interaction-1",
      episodeId: "ep1",
      title: "选择蓝色门",
      instruction:
        "固定机位。构图、取景和焦距从第一帧到最后一帧保持完全一致，不推拉、不变焦、不摇移、不旋转，也不出现虚拟相机呼吸感。",
      options: [
        {
          id: "opt-ep1-blue-door",
          label: "点击 (0.50, 0.50)",
          actionType: "tap",
          actionValue: "(0.50, 0.50)",
          targetNodeId: "ep1-scene-2",
          color: "#3b82f6",
          hotspot: { x: 0.54, y: 0.58 },
        },
        {
          id: "opt-ep1-signal",
          label: "点击 (0.51, 0.82)",
          actionType: "tap",
          actionValue: "(0.51, 0.82)",
          targetNodeId: "ep2b-scene-1",
          color: "#3b82f6",
          hotspot: { x: 0.51, y: 0.82 },
        },
      ],
    },
  },
  {
    id: "ep1-scene-2",
    kind: "scene",
    data: {
      id: "ep1-scene-2",
      episodeId: "ep1",
      title: "地下诊所",
      status: "empty",
      prompt:
        "使用上一段最后一帧作为首帧，保持视觉连续性。侦探刚跨过门槛，蓝色门仍在他身后缓缓合上，地下诊所的冷光从门缝里涌出。",
    },
  },
  {
    id: "ep2-scene-1",
    kind: "scene",
    data: {
      id: "ep2-scene-1",
      episodeId: "ep2",
      title: "涩谷 - 不存在的信号",
      status: "draft",
      prompt:
        "雨中的涩谷路口变成一片不可能存在的反射天线场。健司追踪一段本不该出现的记忆信号，人群和屏幕在雨水里错位重叠。",
    },
  },
  {
    id: "ep2-interaction-1",
    kind: "interaction",
    data: {
      id: "ep2-interaction-1",
      episodeId: "ep2",
      title: "后巷追逐",
      instruction: "保持后巷追逐的节奏，选择转向并决定是否继续追踪信号。",
      options: [
        {
          id: "opt-ep2-swipe",
          label: "向右滑动",
          actionType: "swipe",
          actionValue: "right",
          targetNodeId: "ep2-scene-2",
          color: "#22c55e",
          hotspot: { x: 0.76, y: 0.5 },
        },
      ],
    },
  },
  {
    id: "ep2-scene-2",
    kind: "scene",
    data: {
      id: "ep2-scene-2",
      episodeId: "ep2",
      title: "Echo 开口 - 扣住手腕",
      status: "empty",
      prompt:
        "健司在坏掉的自动售货机蓝光下扣住 Echo 的手腕，但眼前这张脸像从记忆里被擦除一样不断闪烁、错帧、失真。",
    },
  },
  {
    id: "ep2b-scene-1",
    kind: "scene",
    data: {
      id: "ep2b-scene-1",
      episodeId: "ep2b",
      title: "健司的公寓 - 夜",
      status: "draft",
      prompt:
        "健司在狭窄公寓里醒来，雨光穿过百叶窗，在墙上缝出细亮的线。他受损的记忆植入体不断重复一段伪造记忆。",
    },
  },
  {
    id: "ep2b-interaction-1",
    kind: "interaction",
    data: {
      id: "ep2b-interaction-1",
      episodeId: "ep2b",
      title: "设置互动",
      instruction:
        "固定机位，房间保持静止。玩家选择是检查记忆残迹，还是追随蓝色脉冲进入另一条分支。",
      options: [
        {
          id: "opt-ep2b-tap",
          label: "点击 (0.50, 0.50)",
          actionType: "tap",
          actionValue: "(0.50, 0.50)",
          targetNodeId: "ep2b-scene-2",
          color: "#3b82f6",
          hotspot: { x: 0.5, y: 0.5 },
        },
      ],
    },
  },
  {
    id: "ep2b-scene-2",
    kind: "scene",
    data: {
      id: "ep2b-scene-2",
      episodeId: "ep2b",
      title: "记忆唯一的占有物",
      status: "empty",
      prompt:
        "公寓折叠成健司的私人幻觉，被盗记忆投射在破碎玻璃上，像一段无法归还的证词。",
    },
  },
  {
    id: "ep3-scene-1",
    kind: "scene",
    data: {
      id: "ep3-scene-1",
      episodeId: "ep3",
      title: "公寓 - 褪色的照片",
      status: "draft",
      prompt:
        "狭窄公寓里有冷掉的咖啡、堆叠的案件资料和一张家庭照片。照片里的人脸正在慢慢变成噪点。",
    },
  },
  {
    id: "ep3-interaction-1",
    kind: "interaction",
    data: {
      id: "ep3-interaction-1",
      episodeId: "ep3",
      title: "握住芯片 - 做决定",
      instruction: "被盗芯片在健司掌心发热。长按确认，将牺牲一段真实记忆。",
      options: [
        {
          id: "opt-ep3-hold",
          label: "长按 1500ms",
          actionType: "hold",
          actionValue: "1500ms",
          targetNodeId: "ep3-scene-2",
          color: "#d9468a",
          hotspot: { x: 0.5, y: 0.78 },
        },
      ],
    },
  },
  {
    id: "ep3-scene-2",
    kind: "scene",
    data: {
      id: "ep3-scene-2",
      episodeId: "ep3",
      title: "决定已下",
      status: "empty",
      prompt:
        "健司选择燃烧一段真实记忆，用它照亮通往记忆黑市深处的隐藏路线。",
    },
  },
  {
    id: "ep4-scene-1",
    kind: "scene",
    data: {
      id: "ep4-scene-1",
      episodeId: "ep4",
      title: "台场海滨 - 情报交换",
      status: "draft",
      prompt:
        "黎明时分的台场海滨，货运吊机像沉默的审判机器缓慢移动。最后一次情报交换即将开始。",
    },
  },
  {
    id: "ep4-interaction-1",
    kind: "interaction",
    data: {
      id: "ep4-interaction-1",
      episodeId: "ep4",
      title: "覆盖安全锁",
      instruction: "在黎明到来前，于覆盖窗口内连续点击三次。",
      options: [
        {
          id: "opt-ep4-choice",
          label: "1500 毫秒内点击 3 次",
          actionType: "choice",
          actionValue: "3x / 1500ms",
          targetNodeId: "ep4-scene-2",
          color: "#a855f7",
          hotspot: { x: 0.5, y: 0.5 },
        },
      ],
    },
  },
  {
    id: "ep4-scene-2",
    kind: "scene",
    data: {
      id: "ep4-scene-2",
      episodeId: "ep4",
      title: "陷阱已布下",
      status: "empty",
      prompt:
        "琥珀色晨光中，陷阱缓缓收紧。健司看着自己被偷走的记忆变成诱饵。",
    },
  },
];

export const seedStoryEdges: StoryEdge[] = [
  {
    id: "edge-ep1-1",
    source: "ep1-scene-1",
    target: "ep1-interaction-1",
    label: "继续",
  },
  {
    id: "edge-ep1-2",
    source: "ep1-interaction-1",
    target: "ep1-scene-2",
    label: "点击",
    actionType: "tap",
  },
  {
    id: "edge-ep1-branch",
    source: "ep1-interaction-1",
    target: "ep2b-scene-1",
    label: "点击",
    actionType: "tap",
  },
  {
    id: "edge-ep2-1",
    source: "ep2-scene-1",
    target: "ep2-interaction-1",
    label: "继续",
  },
  {
    id: "edge-ep2-2",
    source: "ep2-interaction-1",
    target: "ep2-scene-2",
    label: "向右滑动",
    actionType: "swipe",
  },
  {
    id: "edge-ep2b-1",
    source: "ep2b-scene-1",
    target: "ep2b-interaction-1",
    label: "继续",
  },
  {
    id: "edge-ep2b-2",
    source: "ep2b-interaction-1",
    target: "ep2b-scene-2",
    label: "点击",
    actionType: "tap",
  },
  {
    id: "edge-ep3-1",
    source: "ep3-scene-1",
    target: "ep3-interaction-1",
    label: "继续",
  },
  {
    id: "edge-ep3-2",
    source: "ep3-interaction-1",
    target: "ep3-scene-2",
    label: "长按 1500ms",
    actionType: "hold",
  },
  {
    id: "edge-ep4-1",
    source: "ep4-scene-1",
    target: "ep4-interaction-1",
    label: "继续",
  },
  {
    id: "edge-ep4-2",
    source: "ep4-interaction-1",
    target: "ep4-scene-2",
    label: "选择 A",
    actionType: "choice",
  },
];
