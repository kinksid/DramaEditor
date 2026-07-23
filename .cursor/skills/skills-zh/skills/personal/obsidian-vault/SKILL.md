---
name: obsidian-vault
description: 在 Obsidian 仓库中搜索、创建和管理带有 wikilinks 和索引笔记的笔记。当用户想要在 Obsidian 中查找、创建或组织笔记时使用。
---

# Obsidian 仓库

## 仓库位置

`/mnt/d/Obsidian Vault/AI Research/`

大部分扁平在根级别。

## 命名约定

- **索引笔记**：聚合相关主题（例如，`Ralph Wiggum Index.md`、`Skills Index.md`、`RAG Index.md`）
- 所有笔记名称使用**标题大小写**
- 不使用文件夹进行组织 - 改用链接和索引笔记

## 链接

- 使用 Obsidian `[[wikilinks]]` 语法：`[[Note Title]]`
- 笔记在底部链接到依赖/相关笔记
- 索引笔记只是 `[[wikilinks]]` 列表

## 工作流程

### 搜索笔记

```bash
# 按文件名搜索
find "/mnt/d/Obsidian Vault/AI Research/" -name "*.md" | grep -i "keyword"

# 按内容搜索
grep -rl "keyword" "/mnt/d/Obsidian Vault/AI Research/" --include="*.md"
```

或直接对仓库路径使用 Grep/Glob 工具。

### 创建新笔记

1. 文件名使用**标题大小写**
2. 将内容编写为学习单元（根据仓库规则）
3. 在底部添加 `[[wikilinks]]` 到相关笔记
4. 如果是编号序列的一部分，使用分层编号方案

### 查找相关笔记

在整个仓库中搜索 `[[Note Title]]` 以查找反向链接：

```bash
grep -rl "\\[\\[Note Title\\]\\]" "/mnt/d/Obsidian Vault/AI Research/"
```

### 查找索引笔记

```bash
find "/mnt/d/Obsidian Vault/AI Research/" -name "*Index*"
```
