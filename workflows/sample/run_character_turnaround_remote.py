#!/usr/bin/env python3
"""
远程直连 ComfyUI API — 角色设定三视图加特写_自动补提示词

适用：另一台电脑的 Cursor / Python 客户端，直连服务端 ComfyUI（不经 IC_Unlimited）。

前置条件（服务端 10.11.8.22）：
  1. Comfy Desktop 已启动且开启 --listen（局域网可访问 8188）
  2. 防火墙放行 TCP 8188
  3. 工作流依赖的模型/节点已安装（z_image、llama_cpp Qwen3.5-9B 等）

用法：
  # 仅改提示词（使用工作流内默认控制图）
  python run_character_turnaround_remote.py

  # 指定提示词 + 控制参考图
  python run_character_turnaround_remote.py --prompt "赛博朋克女黑客，银色短发" --image ref.png

  # 自定义 ComfyUI 地址
  set COMFY_BASE_URL=http://10.11.8.22:8188
  python run_character_turnaround_remote.py --prompt "中国写实北宋40岁老兵，身穿北宋步兵甲胄"
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────────────────
COMFY_BASE_URL = os.getenv("COMFY_BASE_URL", "http://10.11.8.22:8188").rstrip("/")
WORKFLOW_PATH = Path(__file__).resolve().parent.parent / "角色设定三视图加特写_自动补提示词.json"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"
POLL_INTERVAL = 3
HISTORY_TIMEOUT = 1800  # 含两次 llama_cpp + 生图，建议 ≥30 分钟

# 工作流可覆盖节点（见 workflows/custom/*.config.json）
NODE_PROMPT_TEXT = "28"   # CR Text — 用户角色主题描述
NODE_CONTROL_IMAGE = "12" # LoadImage — ControlNet 参考图
NODE_KSAMPLER_SEED = "2"
NODE_LLAMA1_SEED = "26"   # 角色卡 JSON 生成
NODE_LLAMA2_SEED = "33"   # 英文提示词生成
NODE_SAVE_IMAGE = "4"     # SaveImage 输出节点


def api_request(method: str, path: str, data: dict | None = None, timeout: int = 120) -> dict:
    url = f"{COMFY_BASE_URL}{path}"
    body = None
    headers = {}
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} {path}: {detail[:800]}") from e


def check_server() -> None:
    stats = api_request("GET", "/system_stats", timeout=15)
    print(f"[OK] ComfyUI 在线: {COMFY_BASE_URL}")
    if stats:
        vram = stats.get("devices", [{}])[0].get("vram_total", 0)
        if vram:
            print(f"     VRAM: {vram / 1024**3:.1f} GB")


def load_workflow() -> dict:
    if not WORKFLOW_PATH.exists():
        raise FileNotFoundError(f"工作流不存在: {WORKFLOW_PATH}")
    with WORKFLOW_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def upload_image(image_path: Path) -> str:
    """上传图片到 ComfyUI input，返回服务端文件名。"""
    mime, _ = mimetypes.guess_type(image_path.name)
    mime = mime or "application/octet-stream"
    boundary = f"----ComfyUIBoundary{uuid.uuid4().hex}"

    with image_path.open("rb") as f:
        file_data = f.read()

    body = b"".join([
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="image"; filename="{image_path.name}"\r\n'.encode(),
        f"Content-Type: {mime}\r\n\r\n".encode(),
        file_data,
        b"\r\n",
        f"--{boundary}\r\n".encode(),
        b'Content-Disposition: form-data; name="overwrite"\r\n\r\n',
        b"true\r\n",
        f"--{boundary}--\r\n".encode(),
    ])

    req = urllib.request.Request(
        f"{COMFY_BASE_URL}/upload/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        result = json.loads(resp.read())
    name = result.get("name") or result.get("filename")
    if not name:
        raise RuntimeError(f"上传失败，响应: {result}")
    print(f"[OK] 图片已上传: {image_path.name} -> {name}")
    return name


def patch_workflow(
    workflow: dict,
    *,
    prompt_text: str,
    control_image: str | None,
    seed: int | None,
) -> dict:
    wf = json.loads(json.dumps(workflow))  # deep copy

    wf[NODE_PROMPT_TEXT]["inputs"]["text"] = prompt_text

    if control_image:
        wf[NODE_CONTROL_IMAGE]["inputs"]["image"] = control_image

    if seed is not None:
        wf[NODE_KSAMPLER_SEED]["inputs"]["seed"] = seed
        wf[NODE_LLAMA1_SEED]["inputs"]["seed"] = seed
        wf[NODE_LLAMA2_SEED]["inputs"]["seed"] = seed + 1

    return wf


def submit_prompt(workflow: dict, client_id: str) -> str:
    payload = {"prompt": workflow, "client_id": client_id}
    result = api_request("POST", "/prompt", payload, timeout=300)
    prompt_id = result.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"提交失败: {result}")
    print(f"[OK] 已提交 prompt_id={prompt_id}")
    return prompt_id


def wait_history(prompt_id: str, timeout: int = HISTORY_TIMEOUT) -> dict:
    start = time.time()
    while time.time() - start < timeout:
        history = api_request("GET", f"/history/{prompt_id}", timeout=30)
        if prompt_id in history:
            entry = history[prompt_id]
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                msgs = status.get("messages", [])
                raise RuntimeError(f"ComfyUI 执行失败: {msgs}")
            return entry
        elapsed = int(time.time() - start)
        print(f"  等待中... {elapsed}s", end="\r", flush=True)
        time.sleep(POLL_INTERVAL)
    raise TimeoutError(f"超时（{timeout}s），prompt_id={prompt_id}")


def download_outputs(history_entry: dict, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    outputs = history_entry.get("outputs", {})
    node_out = outputs.get(NODE_SAVE_IMAGE, {})

    for item in node_out.get("images", []):
        filename = item["filename"]
        subfolder = item.get("subfolder", "")
        img_type = item.get("type", "output")
        params = urllib.parse.urlencode({
            "filename": filename,
            "subfolder": subfolder,
            "type": img_type,
        })
        url = f"{COMFY_BASE_URL}/view?{params}"
        local = out_dir / filename
        urllib.request.urlretrieve(url, local)
        saved.append(local)
        print(f"[OK] 已下载: {local}")

    if not saved:
        print("[WARN] 未在 SaveImage 节点找到输出，完整 outputs:")
        print(json.dumps(outputs, ensure_ascii=False, indent=2)[:2000])
    return saved


def main() -> int:
    parser = argparse.ArgumentParser(description="远程直连 ComfyUI — 角色三视图工作流")
    parser.add_argument(
        "--prompt", "-p",
        default="中国写实北宋40岁老兵，身穿北宋步兵甲胄",
        help="节点 28 角色主题描述",
    )
    parser.add_argument(
        "--image", "-i",
        default=None,
        help="ControlNet 参考图本地路径（会上传到 ComfyUI input）",
    )
    parser.add_argument("--seed", type=int, default=None, help="随机种子（同时写入节点 2/26/33）")
    parser.add_argument("--out", default=str(OUTPUT_DIR), help="输出目录")
    args = parser.parse_args()

    print("=" * 60)
    print("  ComfyUI 直连 — 角色设定三视图加特写_自动补提示词")
    print(f"  baseURL: {COMFY_BASE_URL}")
    print("=" * 60)

    check_server()
    workflow = load_workflow()

    control_name = None
    if args.image:
        img_path = Path(args.image)
        if not img_path.exists():
            print(f"[ERROR] 图片不存在: {img_path}", file=sys.stderr)
            return 1
        control_name = upload_image(img_path)

    workflow = patch_workflow(
        workflow,
        prompt_text=args.prompt,
        control_image=control_name,
        seed=args.seed,
    )

    client_id = f"cursor_remote_{uuid.uuid4().hex[:8]}"
    prompt_id = submit_prompt(workflow, client_id)

    print(f"[INFO] 工作流含 2 次 llama_cpp + 生图，预计 5–20 分钟，请耐心等待...")
    history = wait_history(prompt_id)
    print()

    saved = download_outputs(history, Path(args.out))
    print()
    print(f"完成，共 {len(saved)} 张图 -> {args.out}")
    return 0 if saved else 1


if __name__ == "__main__":
    raise SystemExit(main())
