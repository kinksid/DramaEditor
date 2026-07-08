# DramaEditor

互动短剧世界编辑器前端。基于 Next.js 15 + React 19 + Zustand，支持从创意描述与参考素材创建世界、AI 自动拆解剧本，并在故事图中编辑分支剧情与提交图像/视频生成任务。

## 功能概览

### World Builder Home (`/world-builder/home`)

- 创意 Prompt 输入
- **添加参考**：上传图片 / 视频 / 文本，或粘贴文本
- **自动拆解**：调用 LLM 预览世界观、角色场景、剧本（可「应用到草稿」）
- **创建**：拆解结果写入 Setup；若已应用预览草稿则直接复用
- LLM 不可用时显示警告，降级为本地 fallback，不阻塞创建
- 多项目本地持久化，支持「继续观看」与世界库切换

### Setup (`/world-builder/setup`)

四步向导：世界设定 → 角色地点 → 剧本确认 → 生成世界

- 按 `?project=` 加载对应项目
- 完成时同步世界信息，并从剧本自动生成初始故事图
- 支持从参考图提交图像生成任务

### Story Graph (`/world-builder/story-graph`)

- 滚轮缩放画布，中键拖拽平移
- 左键从节点**输出口**拖出连线，在空白处松手弹出「新建节点」菜单
- 选择视频 / 互动 / 结局节点后自动创建并连接
- 剧集框架磁吸对齐、节点拖拽、预览与导出
- **Canvas Agent**：根据上下文建议节点链
- 节点支持图像/视频生成任务提交与轮询回写

### Settings (`/world-builder/settings`)

- **LLM**：从预设下拉选择接入点（局域网 Qwen3.6 / 本机 Ollama / OpenAI 云端）
- **图像 / 视频**：切换 ComfyUI / Seedance 供应商，配置 workflow 路径
- 连接测试、API Key 本地持久化

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS, Lucide |
| 状态 | Zustand + localStorage 持久化 |
| 画布 | React Flow |
| AI 后端 | LLM 预设 + ComfyUI / Seedance BFF |

## 快速开始

### 环境要求

- Node.js 18+
- （推荐）局域网 [Ollama](https://ollama.com/) 运行 Qwen3.6 27B，用于创意拆解
- （可选）ComfyUI 用于图片/视频参考分析与生成
- （可选）OpenAI API Key 用于云端 LLM

### 安装与启动

```bash
npm install
cp .env.local.example .env.local   # 按需修改 LLM 预设与 ComfyUI 地址
npm run dev
```

Windows 也可双击 `run.bat` 一键安装依赖并启动。

开发服务器默认监听 `0.0.0.0:3000`，脚本会输出局域网访问地址。

### 环境变量

在 `.env.local` 中配置（可复制 `.env.local.example`）：

```bash
# LLM 预设（启动时自动探测并接入）
LLM_PRESET_ID=ollama-lan-qwen36
LLM_PRESETS_PATH=config/llm-presets.json

# 图像 / 视频 / 上传
COMFYUI_BASE_URL=http://127.0.0.1:8188
SEEDANCE_API_KEY=
UPLOAD_DIR=public/uploads
ENABLE_MOCK_GENERATION=true
```

### LLM 预设接入

服务启动时会自动探测 [`config/llm-presets.json`](config/llm-presets.json) 中的接入点，并在控制台输出可用数量：

| 预设 ID | 说明 | 协议 |
|---------|------|------|
| `ollama-lan-qwen36` | 局域网 Qwen3.6 27B（默认 `10.11.8.22:11434`） | Ollama 原生 `/api/chat` |
| `ollama-local` | 本机 Ollama | Ollama 原生 `/api/chat` |
| `openai-cloud` | OpenAI 云端 | 需配置 `OPENAI_API_KEY` |

**局域网 Qwen3.6 前置条件**：

1. 服务端 Ollama 监听 `0.0.0.0:11434`（环境变量 `OLLAMA_HOST=0.0.0.0`）
2. 已拉取模型 `qwen3.6:27b`
3. IP 变更时编辑 `config/llm-presets.json` 中的 `baseUrl`

**用户选择**：打开 Settings → LLM Tab，从下拉列表选择接入点。选择会持久化到 localStorage，刷新后自动恢复。

**使用该 LLM 的 API**：

- `POST /api/world-builder/decompose` — Home 创意拆解（支持 `llmPresetId`）
- `POST /api/world-builder/agent/suggest-chain` — 故事图 Canvas 建链建议

**首次拆解较慢**：27B 模型冷启动可能需要 30–60 秒，属正常现象。

### 故障排查

| 现象 | 处理 |
|------|------|
| 启动日志 `0/3 可用` | 检查 Ollama 是否运行；确认 `.env.local` 中 `LLM_PRESET_ID`；重启 `npm run dev` |
| Setup 字段为空 / 仅原始描述 | LLM 拆解走了 fallback；查看 Home 黄色警告；在 Settings 测试 LLM 连接 |
| 局域网 Ollama 探测超时 | 运行 `npx tsx scripts/testLlmBootstrap.mjs`；确认防火墙放行 11434 |
| 生成任务「任务不存在」 | 开发模式需重启服务后重新提交（taskStore 在进程内） |

## 项目结构

```
config/
└── llm-presets.json           # LLM 接入预设
workflows/                     # ComfyUI workflow 模板
src/
├── app/
│   ├── api/world-builder/     # BFF：decompose / generate / providers / agent
│   └── world-builder/         # 页面路由
├── components/
│   ├── story-graph/           # 故事图画布与节点
│   └── world-builder/         # 布局、参考上传、拆解预览等
├── lib/
│   ├── providers/             # LLM / 图像 / 视频 Provider 层
│   ├── generationClient.ts    # 前端生成任务封装
│   ├── worldBuilderApi.ts     # 前端 API 封装
│   ├── worldBuilderServer.ts  # 服务端 LLM / ComfyUI 调用
│   └── worldBuilderProject.ts # 多项目模型与迁移
├── stores/
│   ├── worldBuilderStore.ts   # 核心状态（含 projects[]）
│   └── providerSettingsStore.ts
├── instrumentation.ts         # 启动时 LLM 预设探测
└── types/
    └── worldBuilder.ts
```

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（含局域网地址提示） |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 检查 |
| `npm run lint` | ESLint |
| `npm run inspect:hourly` | Playwright 功能巡检 |
| `node scripts/testProviderApis.mjs` | Provider API 冒烟测试（8 项） |
| `npx tsx scripts/testLlmBootstrap.mjs` | LLM 预设探测诊断 |
| `npx tsx scripts/testDecompose.mjs` | 完整拆解链路测试 |

## 数据持久化

- Store key：`drama-world-builder`（localStorage，version 6）
- Provider 设置：`drama-editor-provider-settings`（localStorage）
- 上传文件：`public/uploads/`（已加入 `.gitignore`）
- 每个「创建」生成独立 `WorldProject`，含 setupDraft、角色、地点、剧集、节点、边

## 典型工作流

1. 打开 `/world-builder/home`，输入创意并添加参考素材
2. （可选）点击「自动拆解」预览结果，并「应用到草稿」
3. 点击「创建」→ 进入 Setup 确认四步内容
4. 「打开故事图」→ 在画布上继续编辑节点与分支
5. 在 Settings 配置 LLM / 图像 / 视频供应商
6. 在世界库 `/world-builder/worlds` 切换历史项目

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)。

## License

Private — 内部项目
