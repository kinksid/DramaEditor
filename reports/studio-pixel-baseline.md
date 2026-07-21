# Dreem Creator Studio 像素与 IA 基线

更新时间：2026-07-21 21:20 Asia/Shanghai

## 证据边界

- 2026-07-21 浏览器核验：`https://studio.dreem-world.ai/`、`/worlds`、`/worlds/example/characters`、`/worlds/example/locations`、`/worlds/example/storylines` 与 `/stories/example` 均在展示产品内容前重定向到 `/sign-in`。
- 登录墙可确认左右分栏结构、品牌插画区与 Apple、Google、邮箱登录区；无法确认登录后的世界卡片、详情标签或故事控件。
- 未获得登录后页面 DOM、截图或可复用会话，因此不记录未经证实的卡片数量、按钮和精确尺寸。
- `https://www.dreem-world.ai/` 仅作公开品牌语义辅证，不替代 Studio 登录后页面的像素证据。
- 已确认产品决策优先于旧实现：炭黑 + 玫瑰；Public Sans 正文字体；Instrument Serif 展示字体。

## 可执行基线

| 范围 | 本地路由 | 已确认基线 |
| --- | --- | --- |
| 世界列表 | `/world-builder/worlds` | 炭黑舞台、低对比边框、克制玫瑰操作色；标题使用 Instrument Serif，正文使用 Public Sans |
| 世界详情 | `/world-builder/worlds/[worldId]/characters`、`locations`、`storylines` | 三个稳定子路由，共享世界上下文和标签导航；不可臆造 Studio 登录后控件 |
| 故事详情 | `/world-builder/stories/[storyId]` | 参数必须驱动当前故事上下文；保持电影感暗色信息层级 |
| 公共别名 | `/worlds`、`/worlds/:worldId/*`、`/stories/:storyId` | 通过 rewrite 映射到本地对应路由，参数原样保留 |

## 视觉令牌

- Stage：`#0c0a0f`
- Panel/Card：`#161218`
- Border：`#2a2228`
- Primary text：`#f7f2f4`
- Muted text：`#9a8d93`
- Rose action：`#d47893`
- Rose soft：`#2a1a22`
- 正文：Public Sans
- 展示标题：Instrument Serif

## 待补证

- 登录后 `/worlds` 的容器宽度、列数、卡片比例、封面裁切和 hover/selected 状态。
- 世界详情三个标签页的导航位置、信息密度、空状态和编辑入口。
- `/stories/:storyId` 的 hero 比例、内容分栏与操作区层级。
