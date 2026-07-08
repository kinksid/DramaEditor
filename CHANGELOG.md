# 更新日志

本文件记录 DramaEditor 的重要版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [0.2.0] - 2026-07-08

### 新增

- **AI Provider 层**：统一 LLM / 图像 / 视频供应商抽象，支持 ComfyUI、Seedance、OpenAI 兼容 API
- **LLM 预设系统**：`config/llm-presets.json` 配置局域网 Qwen3.6、本机 Ollama、OpenAI 云端三档接入
- **启动自动探测**：`instrumentation.ts` 在服务启动时探测预设可用性并自动应用 `LLM_PRESET_ID`
- **Settings 供应商配置**：LLM 预设下拉选择、图像/视频供应商切换、连接测试、localStorage 持久化
- **图像 / 视频生成 BFF**：`POST /api/world-builder/generate/image|video` + 任务轮询
- **Canvas 建链 Agent**：`POST /api/world-builder/agent/suggest-chain` 根据上下文建议节点链
- **ComfyUI 工作流模板**：`workflows/` 目录 txt2img、img2img、txt2video 等占位 workflow
- **生成历史与任务队列**：故事图节点支持提交生成任务、轮询状态、回写结果
- **诊断脚本**：`testProviderApis.mjs`、`testLlmBootstrap.mjs`、`testDecompose.mjs` 等

### 修复

- Next.js 开发模式下 `taskStore` / Provider 运行时配置不共享 → 改用 `globalThis` 单例
- Home 创建时 LLM 预设未同步到服务端 → 进入 World Builder 自动 `loadFromServer`，拆解前 `ensureActiveLlmPreset`
- Windows 局域网访问 Ollama 时 `fetch` 不稳定 → 增加 `http` 后备与重试
- LLM 返回 markdown 包裹 JSON → `parseLlmJson` 自动提取
- Home 创建忽略「自动拆解」预览草稿 → 优先复用 `lastDecompose`
- 重复轮询、刷新后卡在 `generating`、建链节点定位等交互问题

### 变更

- 局域网 Qwen3.6 预设改为 **Ollama 原生 API**（`/api/chat`），关闭 `think` 模式
- 探测失败时仍应用 `LLM_PRESET_ID` 指定预设，拆解阶段继续重试连接
- `decompose` API 支持请求体传入 `llmPresetId`

## [0.1.0] - 2026-07-07

### 新增

- **World Builder Home**：创意 Prompt、参考素材上传、自动拆解预览、多项目创建
- **Setup 四步向导**：世界设定 → 角色地点 → 剧本确认 → 生成世界
- **Story Graph**：滚轮缩放、中键平移、拖线新建节点、剧集磁吸对齐
- **多项目本地持久化**：`projects[]` + `?project=` 路由加载
- **Ollama 拆解 BFF**：`POST /api/world-builder/decompose`
- **ComfyUI 参考分析**：`POST /api/world-builder/comfy/analyze`
- **剧本 → 故事图**：`scriptAnalysis.ts` 自动生成剧集与节点
- **开发脚本**：`scripts/dev.mjs` 输出局域网地址；`run.bat` 一键启动
