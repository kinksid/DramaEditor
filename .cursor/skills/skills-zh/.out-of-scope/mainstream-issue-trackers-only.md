# Issue tracker 集成仅限于主流工具

`setup-matt-pocock-skills` 仅对**主流** issue tracker 提供一等支持。请求添加对小众、新近或单一供应商实验性 tracker 的支持不在范围内。

## 为什么这不在范围内

每个 issue-tracker 后端都将 CLI 结构硬编码到技能中（命令、标志、输出解析）。每个新后端都是永久性的维护负担——它必须随着工具的 CLI 演进保持工作，并且必须持续针对 `/to-prd`、`/to-issues`、`/triage` 等进行测试。只有当相当一部分用户实际使用的 tracker 才值得付出这种成本。

"主流"是一个判断性问题，而非数字门槛：

- GitHub、GitLab 和 Backlog.md 是我们认为的主流工具——广为人知、广泛使用、早已过了实验阶段。
- 一个全新的面向 agent 的工具，即使设计再有趣，如果只有几百个 GitHub star，也不算主流。

Star 数、年龄和下载量在做出判断时是有用的信号，但它们都不是规则。规则是：普通工程师是否能认出这个工具并可能为他们的团队选择它？

非主流 tracker 的逃生通道已经存在：

- `local markdown` 用于轻量级的仓库内跟踪。
- `other/custom` 用于想要自己连接某些东西的用户。

两者都不需要核心技能了解特定工具。

## 先前的请求

- #99 — "添加 dex 作为 issue tracker 后端"（dex 在请求时大约 3 个月大，约 300 个 star）
