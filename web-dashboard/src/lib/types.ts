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
  notes: string;
};

export type ReportMeta = {
  slug: string;
  title: string;
  score: number | null;
  url: string | null;
  legitimacy: string | null;
  verification: string | null;
  location: string | null;
  date: string | null;
  pdfGenerated: boolean;
};

export type Report = ReportMeta & {
  body: string;
};

export type PipelineItem = {
  url: string;
  label?: string;
};

export type Stats = {
  total: number;
  byStatus: Record<string, number>;
  averageScore: number | null;
  pipelineCount: number;
};
