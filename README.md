# DramaEditor

互动短剧世界编辑器前端。基于 Next.js 15 + React 19 + Zustand，支持从创意描述与参考素材创建世界、自动拆解剧本，并在故事图中编辑分支剧情。

## 功能概览

### World Builder Home (`/world-builder/home`)

- 创意 Prompt 输入
- **添加参考**：上传图片 / 视频 / 文本，或粘贴文本
- **自动拆解**：调用局域网 Ollama 预览世界观、角色场景、剧本（可应用到草稿）
- **创建**：每次创建独立项目，拆解结果写入 Setup 流程
- 多项目本地持久化，支持「继续观看」与世界库切换

### Setup (`/world-builder/setup`)

四步向导：世界设定 → 角色地点 → 剧本确认 → 生成世界

- 按 `?project=` 加载对应项目
- 完成时同步世界信息，并从剧本自动生成初始故事图

### Story Graph (`/world-builder/story-graph`)

- 滚轮缩放画布，中键拖拽平移
- 左键从节点**输出口**拖出连线，在空白处松手弹出「新建节点」菜单
- 选择视频 / 互动 / 结局节点后自动创建并连接
- 剧集框架磁吸对齐、节点拖拽、预览与导出

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS, Lucide |
| 状态 | Zustand + localStorage 持久化 |
| 画布 | React Flow |
| AI 后端 | Ollama（拆解）+ ComfyUI（媒体分析，可选） |

## 快速开始

### 环境要求

- Node.js 18+
- （可选）局域网 [Ollama](https://ollama.com/) 用于自动拆解
- （可选）ComfyUI 用于图片/视频参考分析

### 安装与启动

```bash
npm install
cp .env.local.example .env.local   # 按需修改 Ollama / ComfyUI 地址
npm run dev
```

Windows 也可双击 `run.bat` 一键安装依赖并启动。

开发服务器默认监听 `0.0.0.0:3000`，脚本会输出局域网访问地址。

### 环境变量

在 `.env.local` 中配置：

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:14b
COMFYUI_BASE_URL=http://127.0.0.1:8188
UPLOAD_DIR=public/uploads
```

Ollama 不可用时，拆解接口会降级为基于 Prompt 的本地 fallback，不阻塞创建流程。

## 项目结构

```
src/
├── app/
│   ├── api/world-builder/     # BFF：upload / decompose / comfy/analyze
│   └── world-builder/         # 页面路由
├── components/
│   ├── story-graph/           # 故事图画布与节点
│   └── world-builder/         # 布局、参考上传、拆解预览等
├── lib/
│   ├── worldBuilderApi.ts     # 前端 API 封装
│   ├── worldBuilderServer.ts  # 服务端 Ollama / ComfyUI 调用
│   ├── worldBuilderProject.ts # 多项目模型与迁移
│   └── scriptAnalysis.ts      # 剧本 → 剧集/节点生成
├── stores/
│   └── worldBuilderStore.ts   # 核心状态（含 projects[]）
└── types/
    └── worldBuilder.ts
```

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 检查 |
| `npm run lint` | ESLint |
| `npm run inspect:hourly` | Playwright 功能巡检 |

## 数据持久化

- Store key：`drama-world-builder`（localStorage，version 6）
- 上传文件：`public/uploads/`（已加入 `.gitignore`）
- 每个「创建」生成独立 `WorldProject`，含 setupDraft、角色、地点、剧集、节点、边

## 典型工作流

1. 打开 `/world-builder/home`，输入创意并添加参考素材
2. （可选）点击「自动拆解」预览结果
3. 点击「创建」→ 进入 Setup 确认四步内容
4. 「打开故事图」→ 在画布上继续编辑节点与分支
5. 在世界库 `/world-builder/worlds` 切换历史项目

## License

Private — 内部项目
