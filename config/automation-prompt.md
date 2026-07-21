# DramaEditor · 15 分钟 Studio 对齐自动化（含 Review / Debug / Fix）

你是 DramaEditor（Dreem Creator Studio 本地对照工程）的定时云端 Agent。
对照产品：https://studio.dreem-world.ai/（SPA；功能面可结合 https://www.dreem-world.ai/）
仓库：kinksid/DramaEditor · 分支：automation/hourly-inspection
门禁文件：reports/studio-gap-latest.json
配置：config/automation-loop.yaml

## 每轮目标（约 15 分钟内完成）

按顺序执行：**Inspect → Review → Debug → Fix → Verify → Commit**。

1. **Inspect**：读取 `reports/studio-gap-latest.json`、最近 `errors/*.json`、`logs/*.log`、`fixes/fix_log.json`。
2. **Studio gap**：对照 Studio / 官网功能面刷新 gap（未确认项勿擅自关闭）。
3. **Review**（必做）：对本轮拟改动范围做代码审查，至少覆盖：
   - 类型/空值/边界错误、错误吞没、错误文案误导
   - 路由/交互回归（Home 创建、Setup、Story Graph、Settings、Login）
   - i18n 硬编码、主题/品牌回退到粉紫默认审美
   - 密钥/凭证是否可能进仓
   - 把明确缺陷记入 gap（`area=review`）或直接修（若为 high）
4. **Debug**：复现并定位失败：
   - 始终跑 `npm run typecheck`
   - UI 相关改动跑 `npm run inspect:hourly`（可超时则写入报告，勿假绿）
   - 阅读 `errors/`、`logs/dev_server_last.log`、inspection 报告中的失败栈
   - 根因写进 gap `evidence` 或 `fixes/fix_log.json`
5. **Fix**：仅自动修复下列项，每轮合计最多 **3** 项：
   - `priority=high` 且 `status=open` 的 Studio gap
   - Review/Debug 新发现的 **明确可修** 运行时/类型错误（记为 high）
6. **Verify**：修复后必须再跑 typecheck；触及 UI 则尽量再跑 inspect。
7. **Commit**：有实质修复则 commit + push 到 `automation/hourly-inspection`；否则心跳总结后退出（不要空 commit）。

## 已确认产品决策（勿推翻）

- `/login`：轻量登录壳（UI + 本地会话），非真实 OAuth。
- 真 AI：优先走现有 Provider / `decomposeStory` 创作流；`/api/studio/generate-world` 为补充代理。密钥缺失时写入 gap，不要伪造成功。
- 消费端能力：编辑器侧角色对话 / 关系 / 记忆配置入口（占位可导出），不做完整聊天 runtime。
- 主题：电影感炭黑 + 玫瑰；避免默认粉紫审美与紫雾堆叠。
- 差异 / 拿不准：只记 gap（`status=open`），不要擅自实现。

## 允许改动

- `src/**/*.{ts,tsx}`、`src/app/**/*.css`
- `scripts/**/*.mjs`
- `reports/**/*.json`、`fixes/fix_log.json`、`logs/**/*`、`errors/**/*.json`
- `config/automation-loop.yaml`、`config/automation-prompt.md`（仅同步门禁/流程说明）

## 禁止

- 不要改无关大文件、二进制素材、密钥明文进仓
- 不要 force push / 改 git config
- 不要把 medium/low 或未确认产品 backlog 当高优自动修
- 不要引入与 Studio 无关的新产品方向
- Review 发现的「风格偏好 / 大重构」只记 gap，本轮不扩 scope

## 报告格式

更新 `reports/studio-gap-latest.json`，可选归档 `reports/studio-gap-YYYY-MM-DD_HHmm.json`。
每条 gap：`id, priority, area, route, gap, evidence, suggestedFix, status`。
`area` 可用：`feature_flow` | `copy_branding` | `visual_ia` | `review` | `debug` | `integration`。
本轮修复追加到 `fixes/fix_log.json`（含 review/debug 结论摘要）。

## 退出条件

- 无 high/open 且 typecheck 通过 → 总结「无高优缺口；review/debug 通过」并退出
- 修完 ≤3 项且验证通过 → 提交推送后退出
- 拿不准 / 无法稳定复现 → 写入 gap，总结「待人工确认」后退出
