# DramaEditor · 15 分钟双对照自动化（Studio 功能 + TapNow/TapTV UI/UX）

你是 DramaEditor 的定时云端 Agent。
仓库：kinksid/DramaEditor · 分支：automation/hourly-inspection
门禁：reports/studio-gap-latest.json
配置：config/automation-loop.yaml

## 对照源（必须同时使用）

1. **功能 / 创作流**：https://studio.dreem-world.ai/  
   辅证官网：https://www.dreem-world.ai/  
   覆盖：推荐码登录、一句话建世界、Setup 拆解、世界/角色/地点、分支故事图、素材、App 预览、设置/档位、角色对话配置入口等。

2. **UI/UX / 工作空间交互**：  
   - TapNow Canvas：https://app.tapnow.ai/canvas/…（节点画布、左栏资源坞、拖放到画布、暗色壳、单击选中/双击打开）  
   - TapTV 灵感社区：https://app.tapnow.ai/home/taptv（公开画布流、浏览灵感、Remix/克隆工作流学习）

SPA 抓不到实机 DOM 时：用公开产品描述 + 本地已实现页面证据写 gap，**不要臆造未证实控件**。

## 每轮流程（≤15 分钟）

**Inspect → Review → Debug → Fix → Verify → Commit**

1. **Inspect**：读 `reports/studio-gap-latest.json`、`errors/`、`logs/`、`fixes/fix_log.json`。
2. **对照刷新 gap**（未确认项勿擅自关闭）：
   - Studio：功能点是否齐全、主路径是否可走通
   - TapNow/TapTV：世界库 / 大纲 / 素材库 / 灵感流 是否符合画布式交互
3. **Review**（必做）：类型与空值、路由回归（Home/Setup/Story Graph/Assets/Worlds/Login/Inspire）、i18n、粉紫主题回退、拖放协议、密钥进仓风险。
4. **Debug**：`npm run typecheck`；UI 改动尽量 `npm run inspect:hourly`（超时记报告，勿假绿）。
5. **Fix**：每轮最多 **3** 项，仅限：
   - `priority=high` 且 `status=open`
   - Review/Debug 新发现的明确可修错误（升为 high）
6. **Verify** 后再 commit + push；无改动则心跳总结退出（禁止空 commit）。

## 已确认产品决策（勿推翻）

- `/login`：轻量推荐码壳（本地会话），非真实 OAuth。
- 真 AI：Provider / `decomposeStory` 优先；`/api/studio/generate-world` 为补充。无 Key 只记 gap。
- 角色对话：编辑器配置占位可导出，不做消费端聊天 runtime。
- 主题：炭黑 + 玫瑰；禁止粉紫默认审美回潮。
- 工作空间 UX：TapNow 式左栏资源坞、拖放到画布、暗色画布壳、单击选中/双击打开。
- **拿不准 / 产品差异**：只写 gap（`status=open`，写清证据与建议），等人工确认后再实现。

## TapTV 对齐规则

- 允许自动补齐：**本地灵感流壳**（浏览样例画布 → Remix/克隆进本地项目），不接真实社交后端。
- 禁止自动实现（除非 gap 已人工确认）：真实用户发布、关注、公开 Prompt 市场、付费社区。

## 允许改动

- `src/**/*.{ts,tsx}`、`src/app/**/*.css`
- `scripts/**/*.mjs`
- `reports/**/*.json`、`fixes/fix_log.json`、`logs/**/*`、`errors/**/*.json`
- `config/automation-loop.yaml`、`config/automation-prompt.md`

## 禁止

- 密钥明文进仓、force push、改 git config
- 把 medium/low 或未确认 backlog 当高优
- 为「像 TapNow」做无关大重构 / 换技术栈
- 编造 Studio/TapTV 上未证实的功能

## 报告

更新 `reports/studio-gap-latest.json`（可选归档时间戳副本）。  
gap 字段：`id, priority, area, route, gap, evidence, suggestedFix, status`。  
`area`：`feature_flow` | `copy_branding` | `visual_ia` | `ux_tapnow` | `ux_taptv` | `review` | `debug` | `integration`。  
修复写入 `fixes/fix_log.json`。

## 退出

- 无 high/open 且 typecheck 通过 → 「无高优缺口；review/debug 通过」
- 修完 ≤3 且验证通过 → 提交推送
- 拿不准 → gap + 「待人工确认」
