#!/usr/bin/env node
// Headless worker: polls data/dashboard-queue.jsonl and executes career-ops skills via `claude -p`.
// Writes status updates to data/dashboard-queue-status.jsonl.

import { readFile, writeFile, appendFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "data");
const QUEUE_FILE = path.join(DATA_DIR, "dashboard-queue.jsonl");
const STATUS_FILE = path.join(DATA_DIR, "dashboard-queue-status.jsonl");
const PROCESSED_CURSOR = path.join(DATA_DIR, ".dashboard-queue-cursor");
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";

const POLL_MS = 3000;
const JOB_TIMEOUT_MS = 15 * 60 * 1000;

function log(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

async function ensureFiles() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  for (const f of [QUEUE_FILE, STATUS_FILE]) {
    if (!existsSync(f)) await writeFile(f, "");
  }
  if (!existsSync(PROCESSED_CURSOR)) await writeFile(PROCESSED_CURSOR, "0");
}

async function readCursor() {
  try {
    const raw = await readFile(PROCESSED_CURSOR, "utf8");
    return parseInt(raw.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

async function writeCursor(offset) {
  await writeFile(PROCESSED_CURSOR, String(offset));
}

async function writeStatus(entry) {
  await appendFile(STATUS_FILE, JSON.stringify(entry) + "\n");
}

async function readNewJobs() {
  const cursor = await readCursor();
  const st = await stat(QUEUE_FILE);
  if (st.size <= cursor) return { jobs: [], newOffset: cursor };
  const buf = await readFile(QUEUE_FILE);
  const fresh = buf.slice(cursor).toString("utf8");
  const lines = fresh.split("\n").filter((l) => l.trim());
  const jobs = [];
  for (const line of lines) {
    try {
      jobs.push(JSON.parse(line));
    } catch (err) {
      log("skip malformed line:", line.slice(0, 120), err.message);
    }
  }
  return { jobs, newOffset: st.size };
}

function buildSkillArgs(job) {
  const { action, args = {} } = job;
  switch (action) {
    case "evaluate":
      if (!args.url) throw new Error("evaluate requires args.url");
      return `/career-ops oferta ${args.url}`;
    case "scan":
      return `/career-ops scan`;
    case "pdf":
      if (!args.company) throw new Error("pdf requires args.company");
      return `/career-ops pdf ${args.company}`;
    default:
      throw new Error(`unknown action: ${action}`);
  }
}

function runClaude(prompt) {
  return new Promise((resolve) => {
    const child = spawn(CLAUDE_BIN, ["-p", prompt, "--dangerously-skip-permissions"], {
      cwd: REPO_ROOT,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ code: -1, stdout, stderr: stderr + "\n[worker] timeout" });
    }, JOB_TIMEOUT_MS);
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + "\n" + err.message });
    });
  });
}

async function processJob(job) {
  log(`job ${job.id} action=${job.action} start`);
  await writeStatus({ id: job.id, status: "running", startedAt: new Date().toISOString() });

  let prompt;
  try {
    prompt = buildSkillArgs(job);
  } catch (err) {
    await writeStatus({
      id: job.id,
      status: "failed",
      error: err.message,
      finishedAt: new Date().toISOString(),
    });
    log(`job ${job.id} invalid: ${err.message}`);
    return;
  }

  const { code, stdout, stderr } = await runClaude(prompt);
  const status = code === 0 ? "done" : "failed";
  await writeStatus({
    id: job.id,
    status,
    exitCode: code,
    stdoutTail: stdout.slice(-4000),
    stderrTail: stderr.slice(-2000),
    finishedAt: new Date().toISOString(),
  });
  log(`job ${job.id} ${status} code=${code}`);
}

async function tick() {
  const { jobs, newOffset } = await readNewJobs();
  if (jobs.length === 0) return;
  log(`picked up ${jobs.length} job(s)`);
  for (const job of jobs) {
    await writeStatus({ id: job.id, status: "queued", pickedUpAt: new Date().toISOString() });
    await processJob(job);
  }
  await writeCursor(newOffset);
}

async function main() {
  await ensureFiles();
  log(`worker started, watching ${QUEUE_FILE}`);
  while (true) {
    try {
      await tick();
    } catch (err) {
      log("tick error:", err.message);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  log("fatal:", err);
  process.exit(1);
});
