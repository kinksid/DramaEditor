技能组织在 `skills/` 下的桶文件夹中：

- `engineering/` — 日常代码工作
- `productivity/` — 日常非代码工作流工具
- `misc/` — 保留但很少使用
- `personal/` — 与我自己的设置相关，不推广
- `in-progress/` — 尚未准备好发布的草稿
- `deprecated/` — 不再使用

`engineering/`、`productivity/` 或 `misc/` 中的每个技能必须在顶级 `README.md` 中有引用，并在 `.claude-plugin/plugin.json` 中有条目。`personal/`、`in-progress/` 和 `deprecated/` 中的技能不得出现在两者中。

顶级 `README.md` 中的每个技能条目必须将技能名称链接到其 `SKILL.md`。

每个桶文件夹都有一个 `README.md`，列出桶中的每个技能并附有一行描述，技能名称链接到其 `SKILL.md`。