# 仅在硬依赖时使用显式的 `/setup-matt-pocock-skills` 指针

工程技能依赖于每个仓库的配置（issue tracker、分类标签词汇、领域文档布局），这些配置由 `/setup-matt-pocock-skills` 生成。有些技能在没有该配置的情况下无法有意义地运行——它们必须发布到特定的 issue tracker 或应用特定的标签字符串。其他技能仅使用它来优化输出（词汇、ADR 意识），没有它也能优雅降级。

我们将这些分为**硬依赖**和**软依赖**技能：

- **硬依赖**（`to-issues`、`to-prd`、`triage`）——包含明确的一行说明：_"……应该已经提供给你了——如果没有，请运行 `/setup-matt-pocock-skills`。"_ 没有映射，输出是错误的，而不仅仅是模糊的。
- **软依赖**（`diagnose`、`tdd`、`improve-codebase-architecture`、`zoom-out`）——仅在模糊的文本中引用"项目的领域术语表"和"你正在接触的区域的 ADR"。如果文档不存在，技能仍然有效；只是输出不够精确。

这种划分保持了软依赖技能的 token 轻量化，并避免了在不需要的地方盲目复制设置指针。
