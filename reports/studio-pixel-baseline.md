# Studio 像素与信息架构基线

更新时间：2026-07-21 18:40 Asia/Shanghai

## 证据边界

- `https://studio.dreem-world.ai/` 与 `/worlds` 的公开抓取仅返回 “Dreem Creator Studio” SPA 壳。
- 当前没有可复核的登录后 DOM、截图或精确尺寸，因此不记录臆测的控件、字号或间距。
- 已确认设计约束：炭黑舞台、玫瑰强调色；Public Sans 用于 UI，Instrument Serif 用于展示标题；Studio 信息架构优先。

## P0 路由映射

| Studio | 本地实现 | 基线状态 |
| --- | --- | --- |
| `/worlds` | `/world-builder/worlds` | rewrite 已对齐 |
| `/worlds/:worldId` | `/world-builder/worlds/[worldId]` | 详情壳已对齐 |
| `/worlds/:worldId/characters` | 同名本地子路由 | 路由标签已对齐 |
| `/worlds/:worldId/locations` | 同名本地子路由 | 路由标签已对齐 |
| `/worlds/:worldId/storylines` | 同名本地子路由 | 路由标签已对齐 |
| `/stories/:storyId` | `/world-builder/stories/[storyId]` | rewrite 已对齐 |

## 后续像素核验清单

取得 Studio 截图后，在相同视口逐项记录：侧栏宽度、内容最大宽度、首屏纵向节奏、标题字族与字号、卡片圆角/边框、标签激活态、空态和窄屏换行。未取得证据前相关差异保持 open。
