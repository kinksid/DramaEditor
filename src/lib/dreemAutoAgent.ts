export type DreemBlueprintId =
  | "data_harvest"
  | "file_orchestrator"
  | "api_orchestrator";

export type DreemNodeType = "start" | "action" | "end";

export type DreemFlowNode = {
  id: string;
  type: DreemNodeType;
  label: string;
  tool?: string;
};

export type DreemParameter = {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  kind: "text" | "lines";
  defaultValue?: string;
  help?: string;
};

export type DreemBlueprint = {
  id: DreemBlueprintId;
  name: string;
  description: string;
  dependencies: string[];
  nodes: DreemFlowNode[];
  parameters: DreemParameter[];
};

export type DreemIntent = {
  blueprintId: DreemBlueprintId;
  confidence: number;
  matchedKeywords: string[];
  usedFallback: boolean;
};

const BLUEPRINTS: Record<DreemBlueprintId, DreemBlueprint> = {
  data_harvest: {
    id: "data_harvest",
    name: "数据采集器",
    description: "请求网页、按 CSS 选择器提取内容，并导出 CSV。",
    dependencies: ["requests", "beautifulsoup4"],
    nodes: [
      { id: "input", type: "start", label: "设置目标 URL 和选择器" },
      { id: "fetch", type: "action", label: "请求网页数据", tool: "requests" },
      { id: "parse", type: "action", label: "解析页面内容", tool: "BeautifulSoup" },
      { id: "transform", type: "action", label: "清洗与格式化", tool: "csv" },
      { id: "output", type: "end", label: "导出 CSV" },
    ],
    parameters: [
      {
        key: "url",
        label: "目标 URL",
        placeholder: "https://news.ycombinator.com",
        required: true,
        kind: "text",
      },
      {
        key: "selector",
        label: "CSS 选择器",
        placeholder: ".titleline > a",
        required: true,
        kind: "text",
      },
      {
        key: "columnName",
        label: "结果列名",
        placeholder: "标题",
        required: true,
        kind: "text",
        defaultValue: "内容",
      },
    ],
  },
  file_orchestrator: {
    id: "file_orchestrator",
    name: "文件编排器",
    description: "扫描匹配文件，安全复制到目标目录并生成 JSON 报告。",
    dependencies: [],
    nodes: [
      { id: "input", type: "start", label: "指定源目录和匹配模式" },
      { id: "scan", type: "action", label: "扫描匹配文件", tool: "pathlib" },
      { id: "process", type: "action", label: "复制并重命名", tool: "shutil" },
      { id: "log", type: "action", label: "记录处理结果", tool: "json" },
      { id: "output", type: "end", label: "归档至目标目录" },
    ],
    parameters: [
      {
        key: "sourceDir",
        label: "源目录",
        placeholder: "./Downloads",
        required: true,
        kind: "text",
      },
      {
        key: "targetDir",
        label: "目标目录",
        placeholder: "./Archive",
        required: true,
        kind: "text",
      },
      {
        key: "filePattern",
        label: "文件匹配模式",
        placeholder: "*.pdf",
        required: true,
        kind: "text",
        defaultValue: "*",
      },
    ],
  },
  api_orchestrator: {
    id: "api_orchestrator",
    name: "API 编排器",
    description: "依次调用多个 GET 端点，聚合响应并导出 JSON。",
    dependencies: ["requests"],
    nodes: [
      { id: "input", type: "start", label: "配置 API 端点" },
      { id: "auth", type: "action", label: "读取环境变量认证" },
      { id: "request", type: "action", label: "依次发送请求", tool: "requests" },
      { id: "aggregate", type: "action", label: "聚合成功与失败结果" },
      { id: "output", type: "end", label: "保存 JSON" },
    ],
    parameters: [
      {
        key: "baseUrl",
        label: "Base URL",
        placeholder: "https://api.example.com",
        required: true,
        kind: "text",
      },
      {
        key: "endpoints",
        label: "端点列表（每行一个）",
        placeholder: "/users\n/posts\n/health",
        required: true,
        kind: "lines",
      },
      {
        key: "apiKeyEnv",
        label: "API Key 环境变量",
        placeholder: "DREEM_API_KEY",
        required: false,
        kind: "text",
        defaultValue: "DREEM_API_KEY",
        help: "密钥不会写入脚本；运行时从该环境变量读取。",
      },
    ],
  },
};

const KEYWORDS: Record<DreemBlueprintId, string[]> = {
  data_harvest: [
    "爬虫",
    "爬取",
    "抓取",
    "网页",
    "网站",
    "数据采集",
    "harvest",
    "scrape",
    "crawl",
  ],
  file_orchestrator: [
    "文件",
    "批量",
    "重命名",
    "整理",
    "归档",
    "目录",
    "file",
    "rename",
    "archive",
  ],
  api_orchestrator: [
    "api",
    "接口",
    "请求",
    "调用",
    "端点",
    "endpoint",
    "webhook",
  ],
};

export const DREEM_BLUEPRINTS = Object.values(BLUEPRINTS);

export function getDreemBlueprint(id: DreemBlueprintId): DreemBlueprint {
  return BLUEPRINTS[id];
}

export function understandDreemIntent(query: string): DreemIntent {
  const normalized = query.trim().toLocaleLowerCase();
  const matches = (Object.keys(KEYWORDS) as DreemBlueprintId[]).map((id) => {
    const matchedKeywords = KEYWORDS[id].filter((keyword) =>
      normalized.includes(keyword),
    );
    return { id, matchedKeywords };
  });
  matches.sort((left, right) => right.matchedKeywords.length - left.matchedKeywords.length);

  const winner = matches[0];
  const usedFallback = !winner || winner.matchedKeywords.length === 0;
  const blueprintId = usedFallback ? "data_harvest" : winner.id;
  const matchedKeywords = usedFallback ? [] : winner.matchedKeywords;

  return {
    blueprintId,
    matchedKeywords,
    usedFallback,
    confidence: usedFallback
      ? 0
      : Math.min(0.98, 0.58 + matchedKeywords.length * 0.12),
  };
}

function pythonLiteral(value: string | string[]): string {
  return JSON.stringify(value);
}

function requireText(
  params: Record<string, unknown>,
  key: string,
  label: string,
): string {
  const value = params[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`缺少参数：${label}`);
  }
  if (value.length > 2_000 || value.includes("\0")) {
    throw new Error(`参数无效：${label}`);
  }
  return value.trim();
}

function requireHttpUrl(value: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} 必须是有效 URL`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} 仅支持 HTTP 或 HTTPS`);
  }
  return parsed.toString();
}

function parseEndpoints(value: unknown): string[] {
  const entries = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];
  const endpoints = entries
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (endpoints.length === 0) {
    throw new Error("缺少参数：端点列表");
  }
  if (endpoints.length > 20 || endpoints.some((endpoint) => endpoint.length > 500)) {
    throw new Error("端点列表最多支持 20 项，每项不超过 500 个字符");
  }
  return endpoints;
}

function header(title: string, dependencies: string[]): string {
  const install = dependencies.length
    ? `# 运行前安装: python -m pip install ${dependencies.join(" ")}`
    : "# 仅使用 Python 标准库，无需安装额外依赖";
  return `# ==========================================
# Dreem-AutoAgent: ${title}
# 这是生成的脚本，请在你信任的隔离环境中检查后运行。
${install}
# ==========================================
`;
}

function generateDataHarvest(params: Record<string, unknown>): string {
  const url = requireHttpUrl(requireText(params, "url", "目标 URL"), "目标 URL");
  const selector = requireText(params, "selector", "CSS 选择器");
  const columnName =
    typeof params.columnName === "string" && params.columnName.trim()
      ? params.columnName.trim()
      : "内容";

  return `${header("数据采集器", ["requests", "beautifulsoup4"])}
import csv
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

URL = ${pythonLiteral(url)}
SELECTOR = ${pythonLiteral(selector)}
COLUMN_NAME = ${pythonLiteral(columnName)}


def run():
    print("Dreem-Agent: 启动数据采集工作流")
    response = requests.get(
        URL,
        headers={"User-Agent": "Dreem-AutoAgent/1.0"},
        timeout=15,
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    rows = [element.get_text(" ", strip=True) for element in soup.select(SELECTOR)]
    output = Path(f"dreem_harvest_{datetime.now():%Y%m%d_%H%M%S}.csv")
    with output.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.writer(file)
        writer.writerow([COLUMN_NAME])
        writer.writerows([[row] for row in rows])
    print(f"完成：提取 {len(rows)} 条数据，输出 {output}")
    return output


if __name__ == "__main__":
    run()
`;
}

function generateFileOrchestrator(params: Record<string, unknown>): string {
  const sourceDir = requireText(params, "sourceDir", "源目录");
  const targetDir = requireText(params, "targetDir", "目标目录");
  const filePattern =
    typeof params.filePattern === "string" && params.filePattern.trim()
      ? params.filePattern.trim()
      : "*";

  return `${header("文件编排器", [])}
import json
import shutil
from datetime import datetime
from pathlib import Path

SOURCE = Path(${pythonLiteral(sourceDir)}).expanduser()
TARGET = Path(${pythonLiteral(targetDir)}).expanduser()
PATTERN = ${pythonLiteral(filePattern)}


def run():
    print("Dreem-Agent: 启动文件编排工作流")
    if not SOURCE.is_dir():
        raise FileNotFoundError(f"源目录不存在：{SOURCE}")
    TARGET.mkdir(parents=True, exist_ok=True)

    processed = []
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    for index, source in enumerate(SOURCE.glob(PATTERN), 1):
        if not source.is_file():
            continue
        destination = TARGET / f"{source.stem}_{stamp}_{index}{source.suffix}"
        shutil.copy2(source, destination)
        processed.append({
            "original": str(source),
            "new": str(destination),
            "status": "copied",
        })

    report = TARGET / f"file_report_{stamp}.json"
    report.write_text(json.dumps(processed, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"完成：处理 {len(processed)} 个文件，报告 {report}")
    return report


if __name__ == "__main__":
    run()
`;
}

function generateApiOrchestrator(params: Record<string, unknown>): string {
  const baseUrl = requireHttpUrl(
    requireText(params, "baseUrl", "Base URL"),
    "Base URL",
  ).replace(/\/$/, "");
  const endpoints = parseEndpoints(params.endpoints);
  const apiKeyEnv =
    typeof params.apiKeyEnv === "string" && params.apiKeyEnv.trim()
      ? params.apiKeyEnv.trim()
      : "DREEM_API_KEY";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(apiKeyEnv)) {
    throw new Error("API Key 环境变量名称无效");
  }

  return `${header("API 编排器", ["requests"])}
import json
import os
import time
from datetime import datetime
from pathlib import Path

import requests

BASE_URL = ${pythonLiteral(baseUrl)}
ENDPOINTS = ${pythonLiteral(endpoints)}
API_KEY_ENV = ${pythonLiteral(apiKeyEnv)}


def run():
    print("Dreem-Agent: 启动 API 编排工作流")
    headers = {"Accept": "application/json"}
    api_key = os.environ.get(API_KEY_ENV)
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    results = []
    with requests.Session() as session:
        session.headers.update(headers)
        for endpoint in ENDPOINTS:
            url = f"{BASE_URL}/{endpoint.lstrip('/')}"
            try:
                response = session.get(url, timeout=10)
                response.raise_for_status()
                results.append({
                    "endpoint": endpoint,
                    "status": "success",
                    "data": response.json(),
                })
            except (requests.RequestException, ValueError) as error:
                results.append({
                    "endpoint": endpoint,
                    "status": "failed",
                    "error": str(error),
                })
            time.sleep(0.5)

    output = Path(f"api_results_{datetime.now():%Y%m%d_%H%M%S}.json")
    output.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"完成：输出 {output}")
    return output


if __name__ == "__main__":
    run()
`;
}

export function generateDreemFlowCode(
  blueprintId: DreemBlueprintId,
  params: Record<string, unknown>,
): string {
  switch (blueprintId) {
    case "data_harvest":
      return generateDataHarvest(params);
    case "file_orchestrator":
      return generateFileOrchestrator(params);
    case "api_orchestrator":
      return generateApiOrchestrator(params);
  }
}
