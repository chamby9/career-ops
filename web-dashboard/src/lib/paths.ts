import path from "node:path";

export const PROJECT_ROOT = path.resolve(process.cwd(), "..");

export const paths = {
  applications: path.join(PROJECT_ROOT, "data", "applications.md"),
  pipeline: path.join(PROJECT_ROOT, "data", "pipeline.md"),
  reportsDir: path.join(PROJECT_ROOT, "reports"),
  dataDir: path.join(PROJECT_ROOT, "data"),
  profile: path.join(PROJECT_ROOT, "config", "profile.yml"),
  queue: path.join(PROJECT_ROOT, "data", "dashboard-queue.jsonl"),
  queueStatus: path.join(PROJECT_ROOT, "data", "dashboard-queue-status.jsonl"),
};
