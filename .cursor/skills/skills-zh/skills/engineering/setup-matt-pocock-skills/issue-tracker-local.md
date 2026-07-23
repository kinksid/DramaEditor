# Issue tracker: 本地 Markdown

此仓库的 issue 和 PRD 作为 `.scratch/` 中的 markdown 文件存在。

## 约定

- 每个功能一个目录：`.scratch/<feature-slug>/`
- PRD 是 `.scratch/<feature-slug>/PRD.md`
- 实现 issue 是 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号
- 分类状态记录在每个 issue 文件顶部的 `Status:` 行中（参见 `triage-labels.md` 获取角色字符串）
- 评论和对话历史在 `## Comments` 标题下附加到文件底部

## 当技能说"发布到 issue tracker"时

在 `.scratch/<feature-slug>/` 下创建新文件（如果需要则创建目录）。

## 当技能说"获取相关 ticket"时

读取引用路径的文件。用户通常会直接传递路径或 issue 编号。
