import fs from "node:fs/promises";
import path from "node:path";
import { paths } from "./paths";
import type { Application, Report, ReportMeta, PipelineItem, Stats } from "./types";

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

export async function loadApplications(): Promise<Application[]> {
  const content = await readIfExists(paths.applications);
  if (!content) return [];

  const lines = content.split("\n");
  const rows: Application[] = [];
  let inBody = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (trimmed.startsWith("|---") || /^\|[\s-:]+\|/.test(trimmed)) {
      inBody = true;
      continue;
    }
    if (!inBody) {
      if (/^\|\s*#\s*\|/.test(trimmed)) continue;
      continue;
    }

    const cells = trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

    if (cells.length < 9) continue;

    const [num, date, company, role, score, status, pdf, report, notes] = cells;
    const reportMatch = report.match(/\[(\d+)\]\(reports\/([^)]+)\)/);
    const scoreNumMatch = score.match(/([\d.]+)\s*\/\s*5/);

    rows.push({
      num: parseInt(num, 10) || 0,
      date,
      company,
      role,
      score: score || null,
      scoreValue: scoreNumMatch ? parseFloat(scoreNumMatch[1]) : null,
      status,
      pdf: pdf === "✅",
      reportSlug: reportMatch ? reportMatch[2].replace(/\.md$/, "") : null,
      notes,
    });
  }

  return rows.sort((a, b) => b.num - a.num);
}

function parseReportMeta(slug: string, content: string): ReportMeta {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const scoreMatch = content.match(/\*\*Score:\*\*\s*([\d.]+)/);
  const urlMatch = content.match(/\*\*URL:\*\*\s*(\S+)/);
  const legitMatch = content.match(/\*\*Legitimacy:\*\*\s*([^\n]+)/);
  const verifMatch = content.match(/\*\*Verification:\*\*\s*([^\n]+)/);
  const locMatch = content.match(/\*\*Location:\*\*\s*([^\n]+)/);
  const dateMatch = content.match(/\*\*Date evaluated:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  const pdfMatch = content.match(/\*\*PDF:\*\*\s*(✅|❌)/);

  return {
    slug,
    title: titleMatch ? titleMatch[1].trim() : slug,
    score: scoreMatch ? parseFloat(scoreMatch[1]) : null,
    url: urlMatch ? urlMatch[1] : null,
    legitimacy: legitMatch ? legitMatch[1].trim() : null,
    verification: verifMatch ? verifMatch[1].trim() : null,
    location: locMatch ? locMatch[1].trim() : null,
    date: dateMatch ? dateMatch[1] : null,
    pdfGenerated: pdfMatch ? pdfMatch[1] === "✅" : false,
  };
}

export async function loadReports(): Promise<ReportMeta[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(paths.reportsDir);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith(".md"));
  const reports: ReportMeta[] = [];

  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(paths.reportsDir, file), "utf8");
    const slug = file.replace(/\.md$/, "");
    reports.push(parseReportMeta(slug, content));
  }

  return reports.sort((a, b) => b.slug.localeCompare(a.slug));
}

export async function loadReport(slug: string): Promise<Report | null> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9_\-.]/g, "");
  if (!safeSlug) return null;

  const file = path.join(paths.reportsDir, `${safeSlug}.md`);
  const content = await readIfExists(file);
  if (!content) return null;

  return { ...parseReportMeta(safeSlug, content), body: content };
}

export async function loadPipeline(): Promise<PipelineItem[]> {
  const content = await readIfExists(paths.pipeline);
  if (!content) return [];

  const items: PipelineItem[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    const urlSource = bulletMatch ? bulletMatch[1] : line;

    const mdLinkMatch = urlSource.match(/\[([^\]]+)\]\((https?:\/\/\S+)\)/);
    if (mdLinkMatch) {
      items.push({ url: mdLinkMatch[2], label: mdLinkMatch[1] });
      continue;
    }

    const urlMatch = urlSource.match(/(https?:\/\/\S+)/);
    if (urlMatch) items.push({ url: urlMatch[1] });
  }
  return items;
}

export async function loadStats(): Promise<Stats> {
  const [apps, pipeline] = await Promise.all([loadApplications(), loadPipeline()]);

  const byStatus: Record<string, number> = {};
  let scoreSum = 0;
  let scoreCount = 0;

  for (const app of apps) {
    byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;
    if (app.scoreValue !== null) {
      scoreSum += app.scoreValue;
      scoreCount += 1;
    }
  }

  return {
    total: apps.length,
    byStatus,
    averageScore: scoreCount > 0 ? scoreSum / scoreCount : null,
    pipelineCount: pipeline.length,
  };
}
