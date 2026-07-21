import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const BASE_URL = process.env.DRAMAEDITOR_BASE_URL ?? "http://127.0.0.1:3000";
const HOME_PATH = "/world-builder/home";
const WORLD_PATH = "/world-builder";
const STORY_PATH = "/world-builder/stories/the-memory-thief";
const GRAPH_PATH = "/world-builder/story-graph";
const PREVIEW_PATH = "/world-builder/app-preview";
const SETTINGS_PATH = "/world-builder/settings";
const LOCAL_STORAGE_KEY = "drama-world-builder";

const REPORTS_DIR = path.join(ROOT, "reports");
const SNAPSHOTS_DIR = path.join(ROOT, "snapshots");
const LOGS_DIR = path.join(ROOT, "logs");
const ERRORS_DIR = path.join(ROOT, "errors");
const FIXES_DIR = path.join(ROOT, "fixes");

const SERVER_BOOT_TIMEOUT_MS = 120_000;
const RETRY_WAIT_MS = 750;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatStamp(date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const day = `${value.year}-${value.month}-${value.day}`;
  const minute = `${value.hour}-${value.minute}`;
  const second = `${value.hour}-${value.minute}-${value.second}`;
  return {
    day,
    minute,
    second,
    isoLocal: `${day} ${value.hour}:${value.minute}:${value.second} Asia/Shanghai`,
  };
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function ensureDirs() {
  await Promise.all([
    mkdir(REPORTS_DIR, { recursive: true }),
    mkdir(SNAPSHOTS_DIR, { recursive: true }),
    mkdir(LOGS_DIR, { recursive: true }),
    mkdir(ERRORS_DIR, { recursive: true }),
    mkdir(FIXES_DIR, { recursive: true }),
  ]);
}

async function readJsonIfExists(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  return safeJsonParse(await readFile(filePath, "utf8"), fallback);
}

async function appendFixLog(filePath, entry) {
  const current = (await readJsonIfExists(filePath, [])) ?? [];
  current.push(entry);
  await writeFile(filePath, JSON.stringify(current, null, 2));
}

async function waitForServer(baseUrl) {
  const start = Date.now();
  let lastError = "unknown";

  while (Date.now() - start < SERVER_BOOT_TIMEOUT_MS) {
    try {
      const response = await fetch(`${baseUrl}${HOME_PATH}`, { redirect: "manual" });
      if (response.ok) {
        await sleep(2_000);
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(1_000);
  }

  throw new Error(`Server did not become ready within ${SERVER_BOOT_TIMEOUT_MS}ms (${lastError})`);
}

async function settlePage(page) {
  await page.locator("body").waitFor();
  await page.waitForTimeout(400);
}

function startDevServer() {
  const stdout = [];
  const stderr = [];
  const server = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000"], {
    cwd: ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => {
    stdout.push(String(chunk));
  });
  server.stderr.on("data", (chunk) => {
    stderr.push(String(chunk));
  });

  return {
    server,
    stdout,
    stderr,
    async stop() {
      if (server.killed) return;
      server.kill("SIGTERM");
      await sleep(1_500);
      if (!server.killed) server.kill("SIGKILL");
    },
  };
}

async function getPersistedState(page) {
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), LOCAL_STORAGE_KEY);
  const parsed = safeJsonParse(stored, {});
  return parsed?.state ?? {};
}

function buildSnapshot(state, discovery) {
  return {
    generatedAt: new Date().toISOString(),
    discovery,
    project: {
      id: state.world?.id ?? "project_unknown",
      storyRoute: "the-memory-thief",
      localEntryUrl: `${BASE_URL}${STORY_PATH}`,
      remoteEntryUrl: null,
      loginIdentity: "DramaEditor User",
      loginAvailable: false,
      browserSessionAvailable: false,
      latestVersionSource: "local_seed_state",
    },
    world: state.world ?? null,
    setupDraft: state.setupDraft ?? null,
    lastSavedAt: state.lastSavedAt ?? null,
    lastPublishedAt: state.lastPublishedAt ?? null,
    characters: state.characters ?? [],
    locations: state.locations ?? [],
    episodes: state.episodes ?? [],
    nodes: state.nodes ?? [],
    edges: state.edges ?? [],
    capabilities: {
      annotations: false,
      versionHistory: false,
      collaborationPresence: false,
      collaborationPermissions: "static only",
      wordExport: false,
      scriptBackupExport: true,
      search: true,
      themePreferences: false,
      shortcutPreferences: false,
      autosavePreferences: false,
    },
  };
}

function pickChange(previousValue, currentValue, focus) {
  const changed = JSON.stringify(previousValue) !== JSON.stringify(currentValue);
  return {
    focus,
    changed,
    status: previousValue === null ? "baseline_created" : changed ? "changed" : "unchanged",
  };
}

function detectChanges(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot) {
    return [
      { focus: "剧本内容", changed: true, status: "baseline_created" },
      { focus: "角色", changed: true, status: "baseline_created" },
      { focus: "场景时间线", changed: true, status: "baseline_created" },
      { focus: "批注", changed: false, status: "unavailable" },
      { focus: "版本历史", changed: false, status: "unavailable" },
      { focus: "导出", changed: true, status: "baseline_created" },
      { focus: "协作成员", changed: false, status: "unavailable" },
      { focus: "搜索", changed: true, status: "baseline_created" },
      { focus: "设置与偏好", changed: true, status: "baseline_created" },
    ];
  }

  return [
    pickChange(
      {
        world: previousSnapshot.world,
        setupDraft: previousSnapshot.setupDraft,
        nodes: previousSnapshot.nodes?.map((node) => ({ id: node.id, title: node.data?.title, prompt: node.data?.prompt, status: node.data?.status })),
      },
      {
        world: currentSnapshot.world,
        setupDraft: currentSnapshot.setupDraft,
        nodes: currentSnapshot.nodes?.map((node) => ({ id: node.id, title: node.data?.title, prompt: node.data?.prompt, status: node.data?.status })),
      },
      "剧本内容",
    ),
    pickChange(previousSnapshot.characters, currentSnapshot.characters, "角色"),
    pickChange(
      {
        episodes: previousSnapshot.episodes,
        nodes: previousSnapshot.nodes?.map((node) => ({ id: node.id, episodeId: node.data?.episodeId, position: node.position })),
        edges: previousSnapshot.edges,
      },
      {
        episodes: currentSnapshot.episodes,
        nodes: currentSnapshot.nodes?.map((node) => ({ id: node.id, episodeId: node.data?.episodeId, position: node.position })),
        edges: currentSnapshot.edges,
      },
      "场景时间线",
    ),
    { focus: "批注", changed: false, status: "unavailable" },
    { focus: "版本历史", changed: false, status: "unavailable" },
    pickChange(previousSnapshot.capabilities, currentSnapshot.capabilities, "导出"),
    { focus: "协作成员", changed: false, status: "unavailable" },
    pickChange(previousSnapshot.capabilities?.search, currentSnapshot.capabilities?.search, "搜索"),
    pickChange(
      {
        bundleCapabilities: previousSnapshot.capabilities,
        setupDraft: previousSnapshot.setupDraft,
      },
      {
        bundleCapabilities: currentSnapshot.capabilities,
        setupDraft: currentSnapshot.setupDraft,
      },
      "设置与偏好",
    ),
  ];
}

async function measureNavigation(page, name, route, performance) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const startedAt = Date.now();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
      await settlePage(page);
      const endedAt = Date.now();
      const nav = await page.evaluate(() => {
        const entry = performance.getEntriesByType("navigation")[0];
        if (!entry || typeof entry !== "object") return null;
        return {
          domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
          loadEventMs: Math.round(entry.loadEventEnd || entry.duration),
          transferSize: entry.transferSize ?? null,
        };
      });
      performance.push({
        name,
        route,
        wallClockMs: endedAt - startedAt,
        attempt,
        ...(nav ?? {}),
      });
      return;
    } catch (error) {
      lastError = error;
      await sleep(600);
    }
  }

  throw lastError;
}

function addResult(results, payload) {
  results.push(payload);
}

function addError(errors, moduleName, error, extra = {}) {
  errors.push({
    module: moduleName,
    message: error instanceof Error ? error.message : String(error),
    ...extra,
  });
}

function logStep(label) {
  process.stdout.write(`[inspect] ${label}\n`);
}

async function withRepair(page, label, route, fixes, fn) {
  try {
    return await fn();
  } catch (firstError) {
    const repairChain = [
      {
        action: "refresh_page",
        run: async () => {
          await page.reload({ waitUntil: "domcontentloaded" });
          await settlePage(page);
        },
      },
      {
        action: "reload_route",
        run: async () => {
          await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
          await settlePage(page);
        },
      },
      {
        action: "clear_local_cache_and_reload",
        run: async () => {
          await page.evaluate(() => window.localStorage.clear());
          await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
          await settlePage(page);
        },
      },
    ];

    for (const repair of repairChain) {
      try {
        await repair.run();
        const recovered = await fn();
        fixes.push({
          module: label,
          action: repair.action,
          status: "fixed",
        });
        return recovered;
      } catch (repairError) {
        fixes.push({
          module: label,
          action: repair.action,
          status: "failed",
          message: repairError instanceof Error ? repairError.message : String(repairError),
        });
        await sleep(RETRY_WAIT_MS);
      }
    }

    throw firstError;
  }
}

async function runInspection() {
  const discovery = {
    localEntryUrl: `${BASE_URL}${STORY_PATH}`,
    remoteEntryUrl: null,
    loginCredentials: null,
    browserSession: null,
    projectIdSource: "seed world id",
    storyRouteSource: "hard-coded story route in app links",
    notes: [
      "No remote login credentials were found in repository files, env files, or test fixtures.",
      "No external DramaEditor Editor URL was found; local Next.js route was used for offline inspection.",
      "The app behaves as a local prototype with client-side Zustand persistence and no backend version source.",
    ],
  };

  const results = [];
  const errors = [];
  const fixes = [];
  const performance = [];

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);

    logStep("measure home");
    await measureNavigation(page, "home", HOME_PATH, performance);
    logStep("measure world_builder");
    await measureNavigation(page, "world_builder", WORLD_PATH, performance);
    logStep("measure story_project");
    await measureNavigation(page, "story_project", STORY_PATH, performance);
    logStep("measure story_graph");
    await measureNavigation(page, "story_graph", GRAPH_PATH, performance);
    logStep("measure app_preview");
    await measureNavigation(page, "app_preview", PREVIEW_PATH, performance);
    logStep("measure settings");
    await measureNavigation(page, "settings", SETTINGS_PATH, performance);

    logStep("module 剧本编辑器");
    await withRepair(page, "剧本编辑器", GRAPH_PATH, fixes, async () => {
      await page.goto(`${BASE_URL}${GRAPH_PATH}`, { waitUntil: "domcontentloaded" });
      await settlePage(page);

      const initialState = await getPersistedState(page);
      const initialNode = initialState.nodes.find((node) => node.id === "ep4-scene-1");
      const initialPosition = initialNode?.position ?? null;

      await page.locator("select").first().selectOption("ep4");
      await page.waitForTimeout(500);
      await page.locator('[data-testid="rf__node-ep4-scene-1"]').click({ force: true });
      const inspector = page.locator("aside").filter({ hasText: "属性面板" }).first();
      await inspector.waitFor();
      const titleInput = page.locator("label").filter({ hasText: "标题" }).locator("input").first();
      const originalTitle = await titleInput.inputValue();
      const nextTitle = `${originalTitle} 巡检`;
      const titleStart = Date.now();
      await titleInput.fill(nextTitle);
      await page.waitForTimeout(150);
      const mutatedState = await getPersistedState(page);
      const mutatedNode = mutatedState.nodes.find((node) => node.id === "ep4-scene-1");
      if (mutatedNode?.data?.title !== nextTitle) {
        throw new Error("Scene title change did not persist to local store");
      }

      await page.getByRole("button", { name: "关闭节点编辑器" }).click();
      await page.waitForTimeout(200);

      const graphNode = page.locator('[data-testid="rf__node-ep4-scene-1"]');
      const box = await graphNode.boundingBox();
      if (!box) throw new Error("Unable to locate graph node bounding box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 50, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(500);

      if (initialPosition) {
        await page.waitForFunction(async ({ key, nodeId, previousPosition }) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return false;
          const parsed = JSON.parse(raw);
          const node = parsed?.state?.nodes?.find((item) => item.id === nodeId);
          if (!node?.position) return false;
          return node.position.x !== previousPosition.x || node.position.y !== previousPosition.y;
        }, {
          key: LOCAL_STORAGE_KEY,
          nodeId: "ep4-scene-1",
          previousPosition: initialPosition,
        }, { timeout: 2_000 }).catch(() => {});
      }

      const movedState = await getPersistedState(page);
      const movedNode = movedState.nodes.find((node) => node.id === "ep4-scene-1");
      const movedPosition = movedNode?.position ?? null;
      const dragWorked = Boolean(
        initialPosition &&
        movedPosition &&
        (initialPosition.x !== movedPosition.x || initialPosition.y !== movedPosition.y),
      );

      await titleInput.fill(originalTitle);

      addResult(results, {
        module: "剧本编辑器",
        status: dragWorked ? "passed" : "manual_intervention",
        fixStatus: fixes.some((item) => item.module === "剧本编辑器" && item.status === "fixed") ? "fixed_after_retry" : "not_needed",
        notes: [
          "Typing persisted to Zustand local storage.",
          dragWorked ? "Node drag updated stored position." : "Node drag did not update stored position.",
          "Selection worked through React Flow node click.",
          "Undo/redo shortcuts are not implemented in the current UI and require manual product follow-up.",
        ],
        unsupported: ["撤销", "重做"],
        performance: {
          titleEditLatencyMs: Date.now() - titleStart,
          dragPersisted: dragWorked,
        },
      });
    });

    logStep("module 角色面板");
    await withRepair(page, "角色面板", WORLD_PATH, fixes, async () => {
      await page.goto(`${BASE_URL}${WORLD_PATH}`, { waitUntil: "domcontentloaded" });
      await settlePage(page);
      await page.getByRole("button", { name: "添加角色" }).click();
      await page.locator('input[placeholder="角色名"]').fill("巡检角色");
      await page.locator('input[placeholder="年龄"]').fill("28");
      await page.locator('input[placeholder="身份 / 戏剧功能"]').fill("巡检");
      await page.locator('textarea[placeholder="角色描述"]').fill("每小时巡检临时角色");
      await page.getByRole("button", { name: "保存" }).click();
      await page.locator("article").filter({ hasText: "巡检角色" }).first().waitFor();

      const editedCard = page.locator("article").filter({ hasText: "巡检角色" }).first();
      await editedCard.getByRole("button", { name: "编辑" }).click();
      await page.locator('input[placeholder="角色名"]').fill("巡检角色已编辑");
      await page.getByRole("button", { name: "保存" }).click();
      await page.locator("article").filter({ hasText: "巡检角色已编辑" }).first().waitFor();

      const deleteCard = page.locator("article").filter({ hasText: "巡检角色已编辑" }).first();
      await deleteCard.getByRole("button", { name: "删除" }).click();
      await page.waitForTimeout(150);

      addResult(results, {
        module: "角色面板",
        status: "passed",
        fixStatus: fixes.some((item) => item.module === "角色面板" && item.status === "fixed") ? "fixed_after_retry" : "not_needed",
        notes: [
          "Add, edit, and delete flows passed.",
          "Avatar upload UI is not implemented and requires manual follow-up.",
        ],
        unsupported: ["头像上传"],
      });
    });

    logStep("module 场景时间线");
    await withRepair(page, "场景时间线", GRAPH_PATH, fixes, async () => {
      addResult(results, {
        module: "场景时间线",
        status: "manual_intervention",
        fixStatus: "not_applicable",
        notes: [
          "Story graph supports node drag and episode focus, but no episode reorder or insert-scene timeline UI exists.",
          "Timeline-specific drag reorder and scene insertion need product implementation before this checklist can run.",
        ],
        unsupported: ["拖拽调整顺序", "插入场次"],
      });
    });

    logStep("module 批注系统");
    addResult(results, {
      module: "批注系统",
      status: "manual_intervention",
      fixStatus: "not_applicable",
      notes: ["No annotation or threaded comment UI exists in the current build."],
      unsupported: ["新增批注", "回复批注", "删除批注"],
    });

    logStep("module 版本历史");
    addResult(results, {
      module: "版本历史",
      status: "manual_intervention",
      fixStatus: "not_applicable",
      notes: ["No version history UI, version switcher, or diff viewer exists in the current build."],
      unsupported: ["切换版本", "对比差异"],
    });

    logStep("module 导出功能");
    await withRepair(page, "导出功能", SETTINGS_PATH, fixes, async () => {
      await page.goto(`${BASE_URL}${SETTINGS_PATH}`, { waitUntil: "domcontentloaded" });
      await settlePage(page);

      const appDownloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "导出 App 数据" }).click();
      const appDownload = await appDownloadPromise;

      const backupDownloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "导出制作备份" }).click();
      const backupDownload = await backupDownloadPromise;

      addResult(results, {
        module: "导出功能",
        status: "passed",
        fixStatus: fixes.some((item) => item.module === "导出功能" && item.status === "fixed") ? "fixed_after_retry" : "not_needed",
        notes: [
          `App data export download: ${appDownload.suggestedFilename()}`,
          `Backup export download: ${backupDownload.suggestedFilename()}`,
          "Word export is not implemented and requires manual follow-up.",
        ],
        unsupported: ["Word 导出"],
      });
    });

    logStep("module 协作成员");
    addResult(results, {
      module: "协作成员",
      status: "manual_intervention",
      fixStatus: "not_applicable",
      notes: [
        "The app contains only static workflow copy; no live member presence, online status, or permission management UI exists.",
      ],
      unsupported: ["查看在线状态", "权限管理"],
    });

    logStep("module 搜索功能");
    await withRepair(page, "搜索功能", HOME_PATH, fixes, async () => {
      await page.goto(`${BASE_URL}${HOME_PATH}`, { waitUntil: "domcontentloaded" });
      await settlePage(page);
      const searchInput = page.getByPlaceholder("搜索世界");
      await searchInput.fill("血色");
      await page.waitForTimeout(150);
      const matchedCount = await page.locator("text=血色之城").count();
      if (matchedCount === 0) throw new Error("Search keyword filter did not surface expected card");
      addResult(results, {
        module: "搜索功能",
        status: "passed",
        fixStatus: fixes.some((item) => item.module === "搜索功能" && item.status === "fixed") ? "fixed_after_retry" : "not_needed",
        notes: ["Keyword filtering on the home feed passed."],
      });
    });

    logStep("module 设置与偏好");
    await withRepair(page, "设置与偏好", SETTINGS_PATH, fixes, async () => {
      await page.goto(`${BASE_URL}${SETTINGS_PATH}`, { waitUntil: "domcontentloaded" });
      await settlePage(page);
      const bundleInput = page.locator("label").filter({ hasText: "应用包名" }).locator("input");
      await bundleInput.fill("com.dramaplay.inspection");
      const entryMode = page.locator("label").filter({ hasText: "App 入口模式" }).locator("select");
      await entryMode.selectOption("single-story");

      const bundleValue = await bundleInput.inputValue();
      const entryValue = await entryMode.inputValue();
      if (bundleValue !== "com.dramaplay.inspection" || entryValue !== "single-story") {
        throw new Error("Settings form values did not update");
      }

      addResult(results, {
        module: "设置与偏好",
        status: "passed",
        fixStatus: fixes.some((item) => item.module === "设置与偏好" && item.status === "fixed") ? "fixed_after_retry" : "not_needed",
        notes: [
          "Bundle ID input and entry mode select passed.",
          "Theme, keyboard shortcuts, and autosave preferences are not implemented.",
        ],
        unsupported: ["主题", "快捷键", "自动保存"],
      });
    });

    logStep("module App 预览遍历");
    await withRepair(page, "App 预览遍历", PREVIEW_PATH, fixes, async () => {
      await page.goto(`${BASE_URL}${PREVIEW_PATH}`, { waitUntil: "domcontentloaded" });
      await settlePage(page);
      await page.getByRole("button", { name: /选择蓝色门/ }).click();
      await page.getByRole("button", { name: /点击 \(0\.50, 0\.50\)/ }).click();
      await page.waitForTimeout(200);
      const destinationVisible = await page.locator("text=地下诊所").count();
      if (destinationVisible === 0) {
        throw new Error("Preview branch traversal did not reach expected scene");
      }
      addResult(results, {
        module: "App 预览遍历",
        status: "passed",
        fixStatus: fixes.some((item) => item.module === "App 预览遍历" && item.status === "fixed") ? "fixed_after_retry" : "not_needed",
        notes: ["Episode navigation and branch traversal in preview passed."],
      });
    });

    const cleanContext = await browser.newContext();
    const cleanPage = await cleanContext.newPage();
    cleanPage.setDefaultTimeout(10_000);
    logStep("capture clean snapshot");
    await cleanPage.goto(`${BASE_URL}${STORY_PATH}`, { waitUntil: "domcontentloaded" });
    await settlePage(cleanPage);
    const cleanState = await getPersistedState(cleanPage);
    await cleanContext.close();
    await context.close();

    return {
      discovery,
      results,
      errors,
      fixes,
      performance,
      snapshot: buildSnapshot(cleanState, discovery),
    };
  } catch (error) {
    addError(errors, "inspection_runtime", error);
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
      inspectionErrors: errors,
      inspectionFixes: fixes,
      inspectionResults: results,
      inspectionPerformance: performance,
      inspectionDiscovery: discovery,
    });
  } finally {
    await browser.close();
  }
}

function buildRecommendations(results, discovery, fixes) {
  const recommendations = [];
  if (!discovery.remoteEntryUrl || !discovery.loginCredentials) {
    recommendations.push("Provide DramaEditor User credentials and the remote Editor URL to enable true online inspection.");
  }
  if (results.some((result) => result.status === "manual_intervention")) {
    recommendations.push("Implement missing modules (annotations, version history, collaboration presence, timeline insertion/reorder, theme/shortcut/autosave preferences) before expecting full checklist coverage.");
  }
  if (fixes.some((fix) => fix.status === "failed")) {
    recommendations.push("Review failed automatic recovery attempts; repeated failures likely need code-level fixes.");
  }
  return recommendations;
}

async function main() {
  const startedAt = Date.now();
  const stamp = formatStamp(new Date());
  const reportPath = path.join(REPORTS_DIR, `${stamp.day}_${stamp.minute}.json`);
  const errorPath = path.join(ERRORS_DIR, `error_${stamp.day}_${stamp.second}.json`);
  const fixLogPath = path.join(FIXES_DIR, "fix_log.json");
  const functionalLogPath = path.join(LOGS_DIR, "functional_test.log");

  await ensureDirs();

  const serverHandle = startDevServer();
  try {
    await waitForServer(BASE_URL);
    const inspection = await runInspection();
    const projectId = inspection.snapshot.project.id || "project_unknown";
    const snapshotPath = path.join(SNAPSHOTS_DIR, `project_${projectId}.json`);
    const previousSnapshot = await readJsonIfExists(snapshotPath, null);
    const changeSummary = detectChanges(previousSnapshot, inspection.snapshot);
    const recommendations = buildRecommendations(inspection.results, inspection.discovery, inspection.fixes);

    const report = {
      generatedAt: new Date().toISOString(),
      generatedAtLocal: stamp.isoLocal,
      projectId,
      baseUrl: BASE_URL,
      discovery: inspection.discovery,
      changeSummary,
      functionalResults: inspection.results,
      performance: inspection.performance,
      anomalies: inspection.errors,
      fixes: inspection.fixes,
      recommendations,
    };

    await writeFile(snapshotPath, JSON.stringify(inspection.snapshot, null, 2));
    await writeFile(reportPath, JSON.stringify(report, null, 2));

    const passCount = inspection.results.filter((result) => result.status === "passed").length;
    const manualCount = inspection.results.filter((result) => result.status === "manual_intervention").length;
    const failedFixCount = inspection.fixes.filter((fix) => fix.status === "failed").length;
    await appendFile(
      functionalLogPath,
      `[${stamp.isoLocal}] project=${projectId} pass=${passCount} manual=${manualCount} fixes=${inspection.fixes.length} failed_fixes=${failedFixCount} report=${path.relative(ROOT, reportPath)} snapshot=${path.relative(ROOT, snapshotPath)}\n`,
    );

    const hasAnomalies = inspection.errors.length > 0;

    if (hasAnomalies) {
      await writeFile(errorPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        projectId,
        errors: inspection.errors,
        manualInterventionModules: inspection.results
          .filter((result) => result.status === "manual_intervention")
          .map((result) => ({ module: result.module, notes: result.notes })),
      }, null, 2));
    }

    if (inspection.fixes.length > 0) {
      await appendFixLog(fixLogPath, {
        generatedAt: new Date().toISOString(),
        projectId,
        fixes: inspection.fixes,
      });
    }

    const summary = {
      reportPath,
      snapshotPath,
      errorPath: hasAnomalies ? errorPath : null,
      fixLogPath: inspection.fixes.length > 0 ? fixLogPath : null,
      results: {
        passed: passCount,
        manualIntervention: manualCount,
      },
      recommendations,
      runtimeMs: Date.now() - startedAt,
    };

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await serverHandle.stop();
    const serverLogPath = path.join(LOGS_DIR, "dev_server_last.log");
    await writeFile(
      serverLogPath,
      [
        "STDOUT:",
        serverHandle.stdout.join(""),
        "",
        "STDERR:",
        serverHandle.stderr.join(""),
      ].join("\n"),
    );
  }
}

main().catch(async (error) => {
  const failure = {
    generatedAt: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    inspectionErrors: error?.inspectionErrors ?? [],
    inspectionFixes: error?.inspectionFixes ?? [],
    inspectionResults: error?.inspectionResults ?? [],
    inspectionPerformance: error?.inspectionPerformance ?? [],
    inspectionDiscovery: error?.inspectionDiscovery ?? null,
  };
  await ensureDirs();
  const stamp = formatStamp(new Date());
  const failurePath = path.join(ERRORS_DIR, `error_${stamp.day}_${stamp.second}.json`);
  await writeFile(failurePath, JSON.stringify(failure, null, 2));
  console.error(JSON.stringify({ failurePath, message: failure.message }, null, 2));
  process.exitCode = 1;
});
