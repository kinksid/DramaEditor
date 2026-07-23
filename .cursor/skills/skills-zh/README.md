<p>
  <a href="https://www.aihero.dev/s/skills-newsletter">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/total-typescript/image/upload/v1777382277/skills-repo-dark_2x.png">
      <source media="(prefers-color-scheme: light)" srcset="https://res.cloudinary.com/total-typescript/image/upload/v1777382277/skill-repo-light_2x.png">
      <img alt="Skills" src="https://res.cloudinary.com/total-typescript/image/upload/v1777382277/skill-repo-light_2x.png" width="369">
    </picture>
  </a>
</p>

# 面向真实工程师的技能集

[![skills.sh](https://skills.sh/b/mattpocock/skills)](https://skills.sh/mattpocock/skills)

这是我每天用于进行真实工程开发（而非随意编码）的代理技能集。

开发真实的应用程序很难。GSD、BMAD 和 Spec-Kit 等方法试图通过掌控流程来提供帮助。但在此过程中，它们剥夺了你的控制权，使得流程中的错误难以解决。

这些技能设计得小巧、易于调整且可组合。它们适用于任何模型。它们基于数十年的工程经验。随意修改它们，让它们成为你自己的工具。享受使用吧。

如果你想及时了解这些技能的更新以及我创建的任何新技能，可以加入我的通讯订阅，与约 60,000 名开发者一起：

[注册通讯订阅](https://www.aihero.dev/s/skills-newsletter)

## 快速开始（30 秒设置）

1. 运行 skills.sh 安装器：

```bash
npx skills@latest add mattpocock/skills
```

2. 选择你想要的技能，以及要安装它们的编码代理。**确保选择 `/setup-matt-pocock-skills`**。

3. 在你的代理中运行 `/setup-matt-pocock-skills`。它将：
   - 询问你想使用哪个问题跟踪器（GitHub、Linear 或本地文件）
   - 询问你在分类工单时应用的标签（`/triage` 使用标签）
   - 询问你想将创建的文档保存在哪里

4. 完成 - 你已准备就绪。

## 为什么存在这些技能

我构建这些技能是为了解决我在 Claude Code、Codex 和其他编码代理中常见的失败模式。

### #1：代理没有按照我的要求执行

> "没有人确切知道他们想要什么"
>
> David Thomas & Andrew Hunt，《[程序员修炼之道](https://www.amazon.co.uk/Pragmatic-Programmer-Anniversary-Journey-Mastery/dp/B0833F1T3V)》

**问题**。软件开发中最常见的失败模式是错位。你认为开发人员知道你想要什么。然后你看到他们构建的东西——你意识到他们根本没有理解你。

这在 AI 时代也是如此。你和代理之间存在沟通鸿沟。解决方法是进行**深度问答会话**——让代理向你提出关于你正在构建内容的详细问题。

**解决方案**是使用：

- [`/grill-me`](./skills/productivity/grill-me/SKILL.md) - 用于非代码用途
- [`/grill-with-docs`](./skills/engineering/grill-with-docs/SKILL.md) - 与 [`/grill-me`](./skills/productivity/grill-me/SKILL.md) 相同，但添加了更多功能（见下文）

这是我最受欢迎的技能。它们帮助你在开始之前与代理对齐，并深入思考你正在进行的变更。每次想要进行变更时都要使用它们。

### #2：代理过于冗长

> 使用通用语言时，开发人员之间的对话和代码表达都源自同一个领域模型。
>
> Eric Evans，《[领域驱动设计](https://www.amazon.co.uk/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)》

**问题**：在项目开始时，开发人员和为他们构建软件的人（领域专家）通常使用不同的语言。

我在代理中也感受到了同样的紧张关系。代理通常被放入项目中，并要求在使用过程中弄明白术语。所以它们会用 20 个词来表达只需 1 个词就能表达的内容。

**解决方案**是建立共享语言。它是一个帮助代理解码项目中使用的术语的文档。

<details>
<summary>
示例
</summary>

这里有一个来自我的 `course-video-manager` 仓库的 [`CONTEXT.md`](https://github.com/mattpocock/course-video-manager/blob/076a5a7a182db0fe1e62971dd7a68bcadf010f1c/CONTEXT.md) 示例。哪一个更易读？

- **之前**："当课程章节中的课程被设为'真实'（即在文件系统中获得位置）时存在问题"
- **之后**："物化级联存在问题"

这种简洁性在每次会话中都会带来回报。

</details>

这已内置于 [`/grill-with-docs`](./skills/engineering/grill-with-docs/SKILL.md) 中。它是一个问答会话，但帮助你与 AI 建立共享语言，并在 ADR 中记录难以解释的决策。

很难解释这有多强大。它可能是这个仓库中最酷的技术。试试看吧。

> [!TIP]
> 共享语言除了减少冗长之外还有许多其他好处：
>
> - **变量、函数和文件使用共享语言一致命名**
> - 因此，**代码库对代理来说更易于导航**
> - 代理还**在思考上花费更少的 token**，因为它可以使用更简洁的语言

### #3：代码无法工作

> "始终采取小而谨慎的步骤。反馈率是你的速度限制。永远不要承担太大的任务。"
>
> David Thomas & Andrew Hunt，《[程序员修炼之道](https://www.amazon.co.uk/Pragmatic-Programmer-Anniversary-Journey-Mastery/dp/B0833F1T3V)》

**问题**：假设你和代理就对构建什么达成了一致。当代理仍然产生糟糕的代码时会发生什么？

是时候看看你的反馈循环了。如果没有关于它生成的代码实际如何运行的反馈，代理将会盲目飞行。

**解决方案**：你需要常规的反馈循环：静态类型、浏览器访问和自动化测试。

对于自动化测试，红绿重构循环至关重要。这是代理先编写失败的测试，然后修复测试的地方。这有助于为代理提供一致的反馈级别，从而产生更好的代码。

我构建了一个 **[`/tdd`](./skills/engineering/tdd/SKILL.md) 技能**，你可以将其插入任何项目。它鼓励红绿重构，并为代理提供大量关于什么是好测试和坏测试的指导。

对于调试，我还构建了一个 **[`/diagnose`](./skills/engineering/diagnose/SKILL.md)** 技能，将最佳调试实践封装在一个简单的循环中。

### #4：我们构建了一团泥球

> "每天都要投资于系统的设计。"
>
> Kent Beck，《[极限编程解析](https://www.amazon.co.uk/Extreme-Programming-Explained-Embrace-Change/dp/0321278658)》

> "最好的模块是深层的。它们允许通过简单的接口访问大量功能。"
>
> John Ousterhout，《[软件设计的哲学](https://www.amazon.co.uk/Philosophy-Software-Design-2nd/dp/173210221X)》

**问题**：大多数用代理构建的应用都很复杂且难以更改。因为代理可以极大地加速编码，它们也加速了软件熵的增加。代码库以前所未有的速度变得更加复杂。

**解决方案**是对 AI 驱动的开发采用一种全新的方法：关心代码的设计。

这已内置于这些技能的每一层：

- [`/to-prd`](./skills/engineering/to-prd/SKILL.md) 在创建 PRD 之前询问你正在接触哪些模块
- [`/zoom-out`](./skills/engineering/zoom-out/SKILL.md) 告诉代理在整个系统的背景下解释代码

至关重要的是，[`/improve-codebase-architecture`](./skills/engineering/improve-codebase-architecture/SKILL.md) 帮助你拯救已成为泥球的代码库。我建议每隔几天就在你的代码库上运行一次。

### 总结

软件工程基础比以往任何时候都更重要。这些技能是我将这些基础浓缩为可重复实践的最佳尝试，帮助你交付职业生涯中最好的应用程序。享受吧。

## 参考

### 工程

我每天用于代码工作的技能。

- **[diagnose](./skills/engineering/diagnose/SKILL.md)** — 针对严重错误和性能回归的严格诊断循环：重现 → 最小化 → 假设 → 检测 → 修复 → 回归测试。
- **[grill-with-docs](./skills/engineering/grill-with-docs/SKILL.md)** — 问答会话，根据现有领域模型挑战你的计划，完善术语，并内联更新 `CONTEXT.md` 和 ADR。
- **[triage](./skills/engineering/triage/SKILL.md)** — 通过分类角色的状态机对问题进行分类。
- **[improve-codebase-architecture](./skills/engineering/improve-codebase-architecture/SKILL.md)** — 在代码库中寻找深化机会，参考 `CONTEXT.md` 中的领域语言和 `docs/adr/` 中的决策。
- **[setup-matt-pocock-skills](./skills/engineering/setup-matt-pocock-skills/SKILL.md)** — 搭建每个仓库的配置（问题跟踪器、分类标签词汇、领域文档布局），其他工程技能会使用这些配置。在使用 `to-issues`、`to-prd`、`triage`、`diagnose`、`tdd`、`improve-codebase-architecture` 或 `zoom-out` 之前，每个仓库运行一次。
- **[tdd](./skills/engineering/tdd/SKILL.md)** — 使用红绿重构循环进行测试驱动开发。一次构建一个垂直切片的特性或修复错误。
- **[to-issues](./skills/engineering/to-issues/SKILL.md)** — 使用垂直切片将任何计划、规范或 PRD 分解为可独立获取的 GitHub 问题。
- **[to-prd](./skills/engineering/to-prd/SKILL.md)** — 将当前对话上下文转换为 PRD 并将其作为 GitHub 问题提交。无需访谈——只是综合你已经讨论过的内容。
- **[zoom-out](./skills/engineering/zoom-out/SKILL.md)** — 告诉代理放大视野，对不熟悉的代码部分提供更广泛的背景或更高层次的视角。
- **[prototype](./skills/engineering/prototype/SKILL.md)** — 构建一次性原型以充实设计——可以是用于状态/业务逻辑问题的可运行终端应用程序，或者是可以从一个路由切换的几个截然不同的 UI 变体。

### 生产力

通用工作流工具，不特定于代码。

- **[caveman](./skills/productivity/caveman/SKILL.md)** — 超压缩通信模式。通过删除填充内容同时保持完整的技术准确性，将 token 使用量减少约 75%。
- **[grill-me](./skills/productivity/grill-me/SKILL.md)** — 就计划或设计接受严格的面试，直到决策树的每个分支都得到解决。
- **[handoff](./skills/productivity/handoff/SKILL.md)** — 将当前对话压缩成交接文档，以便另一个代理可以继续工作。
- **[write-a-skill](./skills/productivity/write-a-skill/SKILL.md)** — 创建具有适当结构、渐进式披露和捆绑资源的新技能。

### 杂项

我保留但很少使用的工具。

- **[git-guardrails-claude-code](./skills/misc/git-guardrails-claude-code/SKILL.md)** — 设置 Claude Code 钩子以在执行之前阻止危险的 git 命令（push、reset --hard、clean 等）。
- **[migrate-to-shoehorn](./skills/misc/migrate-to-shoehorn/SKILL.md)** — 将测试文件从 `as` 类型断言迁移到 @total-typescript/shoehorn。
- **[scaffold-exercises](./skills/misc/scaffold-exercises/SKILL.md)** — 创建包含部分、问题、解决方案和解释的练习目录结构。
- **[setup-pre-commit](./skills/misc/setup-pre-commit/SKILL.md)** — 设置 Husky pre-commit 钩子，包含 lint-staged、Prettier、类型检查和测试。