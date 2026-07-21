# Dreem Creator Studio 像素与 IA 基线

更新时间：2026-07-21 19:05 Asia/Shanghai

## 证据边界

- `https://studio.dreem-world.ai/`、`/worlds`、`/worlds/example/characters`、`/stories/example` 当前公开抓取均只返回 SPA 标题 `Dreem Creator Studio`。
- 未获得登录后页面 DOM、截图或可复用会话，因此不记录未经证实的按钮、卡片数量和精确尺寸。
- `https://www.dreem-world.ai/` 可确认公开品牌语义：世界、故事、角色、互动视频和 Creator Studio 推荐码入口。
- 已确认产品决策优先于旧实现：炭黑 + 玫瑰；Public Sans 正文字体；Instrument Serif 展示字体。

## 可执行基线

| 范围 | 本地路由 | 已确认基线 |
| --- | --- | --- |
| 世界列表 | `/world-builder/worlds` | 炭黑舞台、低对比边框、克制玫瑰操作色；标题使用 Instrument Serif，正文使用 Public Sans |
| 世界详情 | `/world-builder/worlds/[worldId]/characters`、`locations`、`storylines` | 三个稳定子路由，共享世界上下文和标签导航；不可臆造 Studio 登录后控件 |
| 故事详情 | `/world-builder/stories/[storyId]` | 参数必须驱动当前故事项目上下文；未知项目显示错误态；编辑链接保留同一项目参数 |
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

登录后 Studio 的实际网格列数、侧栏宽度、卡片比例、字号、间距、hover/focus/empty/loading 状态均保持 gap `open`，待人工提供截图或认证会话后再做像素级收敛。
