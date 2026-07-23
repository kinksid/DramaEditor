#!/usr/bin/env node
/**
 * Local half of the dual 5-minute loop.
 * - Pulls cloud commits into /Volumes/YANG/DramaEditor (ff-only)
 * - Writes heartbeat
 * - Runs typecheck + webapp smoke when high gaps exist
 * Does NOT push to GitHub (cloud Automation owns remote writes).
 */
import { spawn } from "node:child_process";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.env.DRAMAEDITOR_ROOT ?? "/Volumes/YANG/DramaEditor";
const LOGS = path.join(ROOT, "logs");
const HEARTBEAT = path.join(LOGS, "automation_heartbeat.log");
const GAP_FILE = path.join(ROOT, "reports", "studio-gap-latest.json");
const BRANCH = "automation/hourly-inspection";

function stamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(",", "");
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += String(c);
    });
    child.stderr.on("data", (c) => {
      stderr += String(c);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function heartbeat(line) {
  await mkdir(LOGS, { recursive: true });
  await appendFile(HEARTBEAT, `[${stamp()} Asia/Shanghai] local ${line}\n`, "utf8");
}

async function readHighOpenGaps() {
  if (!existsSync(GAP_FILE)) return [];
  try {
    const raw = JSON.parse(await readFile(GAP_FILE, "utf8"));
    return (raw.gaps ?? []).filter(
      (g) => g.priority === "high" && g.status === "open",
    );
  } catch {
    return [];
  }
}

async function main() {
  if (!existsSync(ROOT)) {
    console.error(`Local root missing: ${ROOT}`);
    process.exit(1);
  }

  process.chdir(ROOT);
  await heartbeat("start");

  const status = await run("git", ["status", "--porcelain"]);
  const dirty = Boolean(status.stdout.trim());

  let pullNote = "pull_skipped_dirty";
  if (!dirty) {
    const fetch = await run("git", ["fetch", "origin", BRANCH]);
    if (fetch.code !== 0) {
      pullNote = `fetch_failed:${(fetch.stderr || fetch.stdout).slice(0, 120).replace(/\s+/g, " ")}`;
    } else {
      const pull = await run("git", ["pull", "--ff-only", "origin", BRANCH]);
      pullNote =
        pull.code === 0
          ? "pull_ok"
          : `pull_failed:${(pull.stderr || pull.stdout).slice(0, 120).replace(/\s+/g, " ")}`;
    }
  }

  const highOpen = await readHighOpenGaps();
  let verifyNote = "verify_skipped_no_high";
  // Light smoke every local tick (webapp-testing); typecheck when high gaps open
  const smoke = await run("npm", ["run", "test:webapp"]);
  const smokeNote =
    smoke.code === 0
      ? "webapp_smoke_ok"
      : `webapp_smoke_failed:${(smoke.stderr || smoke.stdout).slice(0, 160).replace(/\s+/g, " ")}`;

  if (highOpen.length > 0) {
    const tc = await run("npm", ["run", "typecheck"]);
    verifyNote =
      tc.code === 0
        ? `typecheck_ok gaps=${highOpen.map((g) => g.id).join(",")} ${smokeNote}`
        : `typecheck_failed gaps=${highOpen.map((g) => g.id).join(",")} ${smokeNote}`;
  } else {
    verifyNote = `early_exit_no_high_open ${smokeNote}`;
  }

  const head = await run("git", ["rev-parse", "--short", "HEAD"]);
  const sha = head.stdout.trim() || "unknown";
  await heartbeat(
    `${pullNote} dirty=${dirty} head=${sha} ${verifyNote} (cloud owns push)`,
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        root: ROOT,
        pullNote,
        dirty,
        head: sha,
        highOpen: highOpen.map((g) => g.id),
        verifyNote,
      },
      null,
      2,
    ),
  );
}

main().catch(async (err) => {
  try {
    await heartbeat(`error:${err instanceof Error ? err.message : String(err)}`);
  } catch {
    /* ignore */
  }
  console.error(err);
  process.exit(1);
});
