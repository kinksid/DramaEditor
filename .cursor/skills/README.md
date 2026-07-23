# Cursor Skills（本仓库）

## Design Engineering（emilkowalski）

Installed from [emilkowalski/skills](https://github.com/emilkowalski/skills).

| Skill | Use when |
| --- | --- |
| `emil-design-eng` | Building / polishing UI, easing, press feedback, popovers |
| `improve-animations` | Auditing motion across the app (plan only) |
| `review-animations` | Reviewing a motion diff |
| `find-animation-opportunities` | Finding where motion helps (restraint first) |
| `animation-vocabulary` | Naming a motion effect |
| `apple-design` | Gesture / spring / material patterns |
| `pick-ui-library` | Choosing a trusted library for a UI task |

## Engineering（skills-zh）

Installed from [Karasukaigan/skills-zh](https://github.com/Karasukaigan/skills-zh) → `.cursor/skills/skills-zh/`.

常用（工程）：

| Skill | Path | Use when |
| --- | --- | --- |
| `diagnose` | `skills-zh/skills/engineering/diagnose` | 严重错误 / 性能回归：重现→假设→检测→修复→回归 |
| `tdd` | `skills-zh/skills/engineering/tdd` | 红绿重构、行为级测试 |
| `triage` | `skills-zh/skills/engineering/triage` | 问题分流与优先级 |
| `to-issues` | `skills-zh/skills/engineering/to-issues` | 把发现写成可执行 issue |
| `zoom-out` | `skills-zh/skills/engineering/zoom-out` | 架构层回看 |

完整列表见 `skills-zh/skills/`（含 productivity / misc / deprecated）。

## Webapp testing（Anthropic）

Installed from [anthropics/skills · webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) → `.cursor/skills/webapp-testing/`.

- Playwright 侦察-再行动；优先用 `scripts/with_server.py`（Python）或仓库内 `npm run test:webapp`（Node，已接本项目）。
- 本地冒烟：`npm run test:webapp` → `reports/webapp-smoke/latest.json`

## 10 分钟自动化如何用这些技能

`config/automation-loop.yaml` / Cursor Automation（每 10 分钟）：

1. **webapp-testing**：跑 `npm run test:webapp`（或 `inspect:hourly`）拿失败路由 / console
2. **diagnose**：对失败建可重复反馈环 → 修 1 条 high
3. **tdd / typecheck**：`npm run typecheck`；相关行为补断言
4. **emil-design-eng**：UI 改动保持 cinema dark 可读对比与 press 反馈
