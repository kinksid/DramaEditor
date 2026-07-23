#!/usr/bin/env node
/**
 * DramaEditor webapp smoke — guided by .cursor/skills/webapp-testing
 * Recon → assert critical routes, console errors, and readable contrast on setup.
 *
 * Usage:
 *   npm run test:webapp
 *   DRAMAEDITOR_BASE_URL=http://127.0.0.1:3000 npm run test:webapp
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const BASE = process.env.DRAMAEDITOR_BASE_URL ?? "http://127.0.0.1:3000";
const PROJECT = process.env.DRAMAEDITOR_SMOKE_PROJECT ?? "world-neon-tokyo-noir";
const OUT_DIR = path.join(ROOT, "reports", "webapp-smoke");

const ROUTES = [
  { id: "home", path: "/world-builder/home", expectText: /工作空间|继续工作|最近/ },
  { id: "worlds", path: "/world-builder/worlds", expectText: /工作空间|新建项目|项目/ },
  {
    id: "story",
    path: `/world-builder/stories/${PROJECT}?tab=episodes`,
    expectText: /剧集|角色|视频|交互|素材库/,
  },
  {
    id: "setup",
    path: `/world-builder/setup?project=${PROJECT}`,
    expectText: /搭建互动短剧世界|世界设定|世界标题/,
  },
  {
    id: "story-graph",
    path: `/world-builder/story-graph?project=${PROJECT}`,
    expectText: /素材库|故事图|任务|新建对话/,
  },
];

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  let last = "unknown";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/world-builder/home`, { redirect: "manual" });
      if (res.ok || (res.status >= 300 && res.status < 400)) return;
      last = `status ${res.status}`;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new Error(`Server not ready at ${BASE}: ${last}`);
}

function isFatalConsole(text) {
  const t = text.toLowerCase();
  // Hydration mismatch 视为失败（工作空间已用 hasHydrated 门控）；深度更新与硬崩溃同级
  return (
    t.includes("maximum update depth exceeded") ||
    t.includes("hydration") ||
    t.includes("is not defined") ||
    t.includes("minified react error #") ||
    t.includes("uncaught")
  );
}

function isHydrationWarning(text) {
  return text.toLowerCase().includes("hydration");
}

async function routeSmoke(page, route) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  const onPageError = (err) => pageErrors.push(err.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  try {
    const res = await page.goto(`${BASE}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(400);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    const status = res?.status() ?? 0;
    const allMsgs = [...consoleErrors, ...pageErrors];
    const fatalConsole = allMsgs.filter(isFatalConsole);
    const hydrationWarnings = allMsgs.filter(isHydrationWarning);
    const textOk = route.expectText.test(bodyText);
    const shot = path.join(OUT_DIR, `${stamp()}_${route.id}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    let contrastOk = true;
    let contrastNote = "n/a";
    if (route.id === "setup") {
      const probe = await page.evaluate(() => {
        const input = document.querySelector("input, textarea");
        if (!input) return { ok: false, reason: "no-input" };
        const s = getComputedStyle(input);
        const color = s.color;
        const bg = s.backgroundColor;
        const parse = (c) => {
          const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
          return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
        };
        const fg = parse(color);
        const panel = document.querySelector("main, [class*='max-w-6xl']") || document.body;
        const panelBg = parse(getComputedStyle(panel).backgroundColor) || parse(bg);
        if (!fg || !panelBg) return { ok: true, reason: "unparsed", color, bg };
        const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const L1 = lum(fg);
        const L2 = lum(panelBg);
        const contrast = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        return {
          ok: contrast >= 2.2 && L1 > 0.45,
          contrast,
          color,
          bg,
          reason: contrast >= 2.2 ? "ok" : "low-contrast",
        };
      });
      contrastOk = Boolean(probe.ok);
      contrastNote = JSON.stringify(probe);
    }

    const ok =
      status > 0 &&
      status < 500 &&
      textOk &&
      fatalConsole.length === 0 &&
      contrastOk;

    return {
      id: route.id,
      path: route.path,
      ok,
      status,
      textOk,
      contrastOk,
      contrastNote,
      fatalConsole,
      hydrationWarnings: hydrationWarnings.slice(0, 2),
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      screenshot: shot,
    };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function seedWorldsHydrationTrap(page) {
  // diagnose 反馈环：预置与 SSR 种子不同的项目名，确保 hydration 门控生效
  await page.goto(`${BASE}/world-builder/home`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.evaluate((projectId) => {
    const key = "drama-world-builder";
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const state = parsed?.state;
      if (!state?.projects?.length) return;
      const target =
        state.projects.find((p) => p.id === projectId) || state.projects[0];
      if (target) target.name = "画布 Remix 壳（Remix）";
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch {
      /* ignore */
    }
  }, PROJECT);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = [];

  try {
    await seedWorldsHydrationTrap(page);
    for (const route of ROUTES) {
      results.push(await routeSmoke(page, route));
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    project: PROJECT,
    skill: "webapp-testing + skills-zh/diagnose",
    ok: failed.length === 0,
    failed: failed.map((r) => r.id),
    results,
  };
  const reportPath = path.join(OUT_DIR, `latest.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
