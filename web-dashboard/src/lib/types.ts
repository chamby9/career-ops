export type Application = {
  num: number;
  date: string;
  company: string;
  role: string;
  score: string | null;
  scoreValue: number | null;
  status: string;
  pdf: boolean;
  reportSlug: string | null;
  jdUrl: string | null;
  notes: string;
};

export type LegitimacyTier = "high" | "caution" | "other";

export type ReportMeta = {
  slug: string;
  title: string;
  score: number | null;
  url: string | null;
  legitimacy: string | null;
  legitimacyTier: LegitimacyTier | null;
  verification: string | null;
  location: string | null;
  date: string | null;
  pdfGenerated: boolean;
  archetype: string | null;
  archetypeKey: string | null;
};

export type Report = ReportMeta & {
  body: string;
};

export type PipelineItem = {
  url: string;
  label?: string;
  company?: string;
  role?: string;
};

export type ScanRun = {
  date: string;
  total: number;
  byPortal: Record<string, number>;
};

export type ScanHistory = {
  runs: ScanRun[];
  lastRun: ScanRun | null;
};

export type Stats = {
  total: number;
  byStatus: Record<string, number>;
  averageScore: number | null;
  pipelineCount: number;
};
