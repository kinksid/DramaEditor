# Matt Pocock 技能集

由 Claude Code 加载的代理技能（斜杠命令和行为）集合。技能按桶组织，并由 `/setup-matt-pocock-skills` 发出的每个仓库配置使用。

## 语言

**问题跟踪器**：
托管仓库问题的工具——GitHub Issues、Linear、本地 `.scratch/` markdown 约定或类似工具。`to-issues`、`to-prd`、`triage` 和 `qa` 等技能从中读取和写入。
_避免_：待办事项管理器、待办事项后端、问题主机

**问题**：
**问题跟踪器**中的单个跟踪工作单元——由 `to-issues` 生成的错误、任务、PRD 或切片。
_避免_：工单（仅在引用称其为工单的外部系统时使用）

**分类角色**：
在分类期间应用于**问题**的标准状态机标签（例如 `needs-triage`、`ready-for-afk`）。每个角色通过 `docs/agents/triage-labels.md` 映射到**问题跟踪器**中的实际标签字符串。

## 关系

- **问题跟踪器**包含许多**问题**
- **问题**一次携带一个**分类角色**

## 已标记的歧义

- "backlog" 以前既用于表示托管问题的*工具*，也用于表示其中的*工作主体*——已解决：该工具是**问题跟踪器**；"backlog" 不再用作领域术语。
- "backlog backend" / "backlog manager" ——已解决：合并为**问题跟踪器**。