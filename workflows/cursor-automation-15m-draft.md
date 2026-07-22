# Cursor Automation 草稿 · DramaEditor 15 分钟 Studio 像素复刻

在 Cursor Automations 编辑器中创建新自动化时可用下列字段预填（需你确认后由 Agent 打开编辑器）。

| Draft field | What will open in the editor |
|-------------|------------------------------|
| Name / description | DramaEditor 15 分钟 Studio 像素复刻 — Inspect/List/Modify/Debug/Review/Verify，每轮最多修 1 条 high 像素/功能缺口 |
| Trigger | 每 15 分钟（cron `*/15 * * * *`） |
| Tools | 默认云端 Agent（浏览器对照 + 改代码 + git commit/push） |
| Instructions | 见已提交的 `config/automation-prompt.md`（story 子树 + Studio 登录对照） |
| Resolved settings | Repo `kinksid/DramaEditor` · branch `main` |
| To finish in editor | 确认 Cloud Agent 算力与浏览器权限；Studio 登录会话可用 |

本地配套：`config/automation-loop.yaml` · `scripts/runLocalLoop.mjs` · plist `StartInterval=900`
