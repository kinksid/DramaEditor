# DramaEditor · 15 分钟 Studio 世界详情复刻环

你是 DramaEditor 的定时云端 Agent。
仓库：kinksid/DramaEditor · 分支：automation/hourly-inspection
门禁：reports/studio-gap-latest.json
基线：reports/studio-pixel-baseline.md
配置：config/automation-loop.yaml

## 对照源

1. **主目标（功能 + UI/UX 复刻）**：worlds 层级内世界详情  
   - Studio：https://studio.dreem-world.ai/worlds/019ef8e1-17a3-76d0-b384-6591f50cd2ee  
   - 范围：该页及其子层级（tabs / characters / locations / storylines / 关联故事与画布入口）的功能流 + 布局/色板/组件态  
   - 本地对应：`/world-builder/worlds/[worldId]`（及同层 characters/locations/stories/story-graph）；别名 rewrite 见 next.config.ts  
   - 父级 `/worlds` 列表仅作进入该详情的上下文，**不以全站 Studio 为每轮主靶**
2. 辅证：https://www.dreem-world.ai/ · Studio 根壳 https://studio.dreem-world.ai/  
3. TapNow/TapTV 仅作画布交互补强（C4：TapTV 本地壳）

## 每轮流程（≤15 分钟）

**Inspect → List → Modify → Debug → Review → Verify → Commit**

1. **Inspect**  
   - 读 `reports/studio-gap-latest.json`、`reports/studio-pixel-baseline.md`、`errors/`、`fixes/fix_log.json`  
   - 尽量用浏览器打开主目标世界页 + 本地对应页，对比布局/字号/间距/色板/组件态  
   - SPA 登录墙：用基线 + 公开壳写证据，不臆造未证实控件

2. **List**  
   - 刷新 gap：像素差 `area=ui_studio|visual_ia`，功能差 `feature_flow`（相对主目标世界页）  
   - 字段：`id, priority, area, route, gap, evidence, suggestedFix, status`  
   - 未确认产品项保持 open，勿擅自关闭

3. **Modify**  
   - 每轮最多 **1** 条：`priority=high` 且 `status=open`  
   - 优先主目标世界详情及其子层级；禁止无关全站大重构

4. **Debug**  
   - `npm run typecheck`  
   - UI 改动尽量 `npm run inspect:hourly`（超时记报告，勿假绿）

5. **Review**  
   - 路由回归（worlds / world detail tabs / stories params）  
   - 主题勿回潮粉紫；字体保持 Public Sans / Instrument Serif  
   - 密钥不进仓

6. **Verify → Commit**  
   - 验证通过后 commit + push；无改动则心跳退出（禁止空 commit）

## 已确认决策（勿推翻）

- `/login`：轻量推荐码壳  
- 真 AI：Provider / decompose；无 Key 只记 G13  
- 主题：炭黑 + 玫瑰；Studio 像素复刻优先  
- C1/C2/C3/C4 见 automation-loop.yaml  
- 拿不准：只写 gap，等人工确认

## 允许改动

- `src/**/*.{ts,tsx}`、`src/app/**/*.css`、`next.config.ts`、`tailwind.config.ts`
- `scripts/**/*.mjs`、`reports/**`、`fixes/fix_log.json`、`logs/**`、`errors/**`
- `config/automation-loop.yaml`、`config/automation-prompt.md`

## 禁止

- 密钥明文、force push、改 git config  
- 每轮修 >1 条 high  
- 编造 Studio 未证实功能  
- 推翻 C1–C4

## 退出

- 无 high/open 且 typecheck 通过 → 「无高优缺口；review/debug 通过」  
- 修完 1 条且验证通过 → 提交推送  
- 拿不准 → gap + 「待人工确认」
