---
name: setup-matt-pocock-skills
description: 在 AGENTS.md/CLAUDE.md 中设置 `## Agent skills` 块和 `docs/agents/`，以便工程技能了解此仓库的 issue tracker（GitHub 或本地 markdown）、分类标签词汇和领域文档布局。在首次使用 `to-issues`、`to-prd`、`triage`、`diagnose`、`tdd`、`improve-codebase-architecture` 或 `zoom-out` 之前运行——或者如果这些技能似乎缺少关于 issue tracker、分类标签或领域文档的上下文。
disable-model-invocation: true
---

# 设置 Matt Pocock 的技能

搭建工程技能假设的每个仓库配置：

- **Issue tracker**——issue 存在的位置（默认为 GitHub；本地 markdown 也开箱即用支持）
- **分类标签**——用于五个规范分类角色的字符串
- **领域文档**——`CONTEXT.md` 和 ADR 存在的位置，以及读取它们的消费者规则

这是一个由提示驱动的技能，而不是确定性脚本。探索、展示你发现的内容、与用户确认，然后写入。

## 流程

### 1. 探索

查看当前仓库以了解其起始状态。阅读任何存在的内容；不要假设：

- `git remote -v` 和 `.git/config`——这是 GitHub 仓库吗？哪一个？
- 仓库根目录的 `AGENTS.md` 和 `CLAUDE.md`——任何一个存在吗？其中是否已经有 `## Agent skills` 部分？
- 仓库根目录的 `CONTEXT.md` 和 `CONTEXT-MAP.md`
- `docs/adr/` 和任何 `src/*/docs/adr/` 目录
- `docs/agents/`——此技能的先前输出是否已经存在？
- `.scratch/`——表明本地 markdown issue tracker 约定已经在使用

### 2. 展示发现并询问

总结存在的内容和缺失的内容。然后引导用户**一次一个**地做出三个决策——展示一个部分，获取用户的答案，然后移动到下一个。不要一次性抛出所有三个。

假设用户不知道这些术语的含义。每个部分都以简短的解释开始（它是什么，为什么这些技能需要它，如果他们选择不同的会发生什么变化）。然后显示选项和默认值。

**A 部分——Issue tracker。**

> 解释器："issue tracker"是此仓库的 issue 存在的地方。像 `to-issues`、`triage`、`to-prd` 和 `qa` 这样的技能从中读取和写入——它们需要知道是调用 `gh issue create`、在 `.scratch/` 下写入 markdown 文件，还是遵循你描述的其他工作流程。选择你实际为此仓库跟踪工作的地方。

默认立场：这些技能是为 GitHub 设计的。如果 `git remote` 指向 GitHub，提出那个。如果 `git remote` 指向 GitLab（`gitlab.com` 或自托管主机），提出 GitLab。否则（或者如果用户更喜欢），提供：

- **GitHub**——issue 存在于仓库的 GitHub Issues 中（使用 `gh` CLI）
- **GitLab**——issue 存在于仓库的 GitLab Issues 中（使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI）
- **本地 markdown**——issue 作为此仓库中 `.scratch/<feature>/` 下的文件存在（适用于个人项目或没有远程的仓库）
- **其他**（Jira、Linear 等）——要求用户用一段话描述工作流程；技能将将其记录为自由形式的散文

**B 部分——分类标签词汇。**

> 解释器：当 `triage` 技能处理传入的 issue 时，它会通过状态机移动它——需要评估、等待报告者、准备好让 AFK 代理接收、准备好让人类处理，或不会修复。要做到这一点，它需要应用与你*实际配置的*字符串匹配的标签（或你的 issue tracker 中的等效物）。如果你的仓库已经使用不同的标签名称（例如 `bug:triage` 而不是 `needs-triage`），在这里映射它们，以便技能应用正确的标签而不是创建重复项。

五个规范角色：

- `needs-triage`——维护者需要评估
- `needs-info`——等待报告者
- `ready-for-agent`——完全指定，AFK 就绪（代理可以在没有人类上下文的情况下接收它）
- `ready-for-human`——需要人类实现
- `wontfix`——不会采取行动

默认：每个角色的字符串等于其名称。询问用户是否想要覆盖任何内容。如果他们的 issue tracker 没有现有标签，默认值是可以的。

**C 部分——领域文档。**

> 解释器：一些技能（`improve-codebase-architecture`、`diagnose`、`tdd`）读取 `CONTEXT.md` 文件以学习项目的领域语言，以及 `docs/adr/` 获取过去的架构决策。他们需要知道仓库是否有一个全局上下文或多个（例如具有单独前端/后端上下文的 monorepo），以便他们在正确的位置查找。

确认布局：

- **单上下文**——仓库根目录的一个 `CONTEXT.md` + `docs/adr/`。大多数仓库都是这样。
- **多上下文**——根目录的 `CONTEXT-MAP.md` 指向每个上下文的 `CONTEXT.md` 文件（通常是 monorepo）。

### 3. 确认和编辑

向用户展示草稿：

- 要添加到正在编辑的 `CLAUDE.md` / `AGENTS.md` 中的 `## Agent skills` 块（参见步骤 4 的选择规则）
- `docs/agents/issue-tracker.md`、`docs/agents/triage-labels.md`、`docs/agents/domain.md` 的内容

让他们在写入之前编辑。

### 4. 写入

**选择要编辑的文件：**

- 如果 `CLAUDE.md` 存在，编辑它。
- 否则如果 `AGENTS.md` 存在，编辑它。
- 如果两者都不存在，询问用户要创建哪一个——不要为他们选择。

当 `CLAUDE.md` 已经存在时永远不要创建 `AGENTS.md`（反之亦然）——始终编辑已经存在的那个。

如果所选文件中已经存在 `## Agent skills` 块，就地更新其内容而不是附加重复项。不要覆盖用户对周围部分的编辑。

该块：

```markdown
## Agent skills

### Issue tracker

[一行摘要说明 issue 跟踪的位置]。参见 `docs/agents/issue-tracker.md`。

### 分类标签

[标签词汇的一行摘要]。参见 `docs/agents/triage-labels.md`。

### 领域文档

[布局的一行摘要——"单上下文"或"多上下文"]。参见 `docs/agents/domain.md`。
```

然后使用此技能文件夹中的种子模板作为起点编写三个文档文件：

- [issue-tracker-github.md](./issue-tracker-github.md)——GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md)——GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md)——本地 markdown issue tracker
- [triage-labels.md](./triage-labels.md)——标签映射
- [domain.md](./domain.md)——领域文档消费者规则 + 布局

对于"其他"issue trackers，使用用户的描述从头编写 `docs/agents/issue-tracker.md`。

### 5. 完成

告诉用户设置已完成，哪些工程技能现在将从这些文件中读取。提到他们以后可以直接编辑 `docs/agents/*.md`——仅当他们想要切换 issue trackers 或从头开始时才需要重新运行此技能。
