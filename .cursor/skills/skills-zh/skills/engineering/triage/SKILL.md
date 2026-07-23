---
name: triage
description: 通过由分类角色驱动的状态机对 issue 进行分类。当用户想要创建 issue、分类 issue、审查传入的 bug 或功能请求、为 AFK 代理准备 issue 或管理 issue 工作流时使用。
---

# 分类

将项目 issue tracker 上的 issue 通过小型状态机的分类角色移动。

在分类期间发布到 issue tracker 的每个评论或 issue **必须**以此免责声明开头：

```
> *这是在分类期间由 AI 生成的。*
```

## 参考文档

- [AGENT-BRIEF.md](AGENT-BRIEF.md)——如何编写持久的代理简报
- [OUT-OF-SCOPE.md](OUT-OF-SCOPE.md)——`.out-of-scope/` 知识库如何工作

## 角色

两个**类别**角色：

- `bug`——某些东西坏了
- `enhancement`——新功能或改进

五个**状态**角色：

- `needs-triage`——维护者需要评估
- `needs-info`——等待报告者提供更多信息
- `ready-for-agent`——完全指定，准备好让 AFK 代理接收
- `ready-for-human`——需要人类实现
- `wontfix`——不会采取行动

每个分类的 issue 应该恰好携带一个类别角色和一个状态角色。如果状态角色冲突，标记它并在做任何其他事情之前询问维护者。

这些是规范角色名称——issue tracker 中使用的实际标签字符串可能不同。映射应该已经提供给你——如果没有，请运行 `/setup-matt-pocock-skills`。

状态转换：未标记的 issue 通常首先转到 `needs-triage`；从那里它移动到 `needs-info`、`ready-for-agent`、`ready-for-human` 或 `wontfix`。一旦报告者回复，`needs-info` 返回到 `needs-triage`。维护者可以随时覆盖——标记看起来不寻常的转换并在继续之前询问。

## 调用

维护者调用 `/triage` 并用自然语言描述他们想要什么。解释请求并行动。示例：

- "显示任何需要注意的内容"
- "让我们看看 #42"
- "将 #42 移动到 ready-for-agent"
- "什么准备好让代理接收？"

## 显示需要注意的内容

查询 issue tracker 并展示三个桶，按最旧优先：

1. **未标记**——从未分类。
2. **`needs-triage`**——评估进行中。
3. **`needs-info` 且自上次分类笔记以来有报告者活动**——需要重新评估。

显示计数和每个 issue 的一行摘要。让维护者选择。

## 分类特定 issue

1. **收集上下文。** 阅读完整 issue（正文、评论、标签、报告者、日期）。解析任何先前的分类笔记，以便你不重新询问已解决的问题。使用项目的领域术语表探索代码库，尊重该区域的 ADR。读取 `.out-of-scope/*.md` 并显示任何与此 issue 相似的先前拒绝。

2. **推荐。** 告诉维护者你的类别和状态推荐及推理，加上与 issue 相关的简要代码库摘要。等待指示。

3. **重现（仅 bug）。** 在任何 grilling 之前，尝试重现：阅读报告者的步骤，跟踪相关代码，运行测试或命令。报告发生了什么——成功重现带有代码路径、失败重现或细节不足（强烈的 `needs-info` 信号）。确认的重现使代理简报更强。

4. **Grill（如果需要）。** 如果 issue 需要充实，运行 `/grill-with-docs` 会话。

5. **应用结果：**
   - `ready-for-agent`——发布代理简报评论（[AGENT-BRIEF.md](AGENT-BRIEF.md)）。
   - `ready-for-human`——与代理简报相同的结构，但说明为什么不能委托（判断调用、外部访问、设计决策、手动测试）。
   - `needs-info`——发布分类笔记（模板如下）。
   - `wontfix`（bug）——礼貌解释，然后关闭。
   - `wontfix`（enhancement）——写入 `.out-of-scope/`，从评论链接到它，然后关闭（[OUT-OF-SCOPE.md](OUT-OF-SCOPE.md)）。
   - `needs-triage`——应用角色。如果有部分进展，可选评论。

## 快速状态覆盖

如果维护者说"将 #42 移动到 ready-for-agent"，信任他们并直接应用角色。确认你即将做什么（角色更改、评论、关闭），然后行动。跳过 grilling。如果在没有 grilling 会话的情况下移动到 `ready-for-agent`，询问他们是否想要编写代理简报。

## Needs-info 模板

```markdown
## 分类笔记

**到目前为止我们已确定的：**

- 点 1
- 点 2

**我们仍然需要从你（@reporter）那里得到的：**

- 问题 1
- 问题 2
```

捕获 grilling 期间解决的所有内容在"到目前为止已确定的"下，以便工作不会丢失。问题必须具体且可操作，而不是"请提供更多信息"。

## 恢复先前的会话

如果 issue 上存在先前的分类笔记，阅读它们，检查报告者是否回答了任何未完成的问题，并在继续之前展示更新的图片。不要重新询问已解决的问题。
