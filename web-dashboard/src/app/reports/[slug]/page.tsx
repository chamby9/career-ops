import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadReport } from "@/lib/parsers";
import { LiveRefresh } from "@/components/live-refresh";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = await loadReport(decodeURIComponent(slug));
  if (!report) notFound();

  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh />
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        {report.url && (
          <Button asChild variant="outline" size="sm">
            <a href={report.url} target="_blank" rel="noopener noreferrer">
              Open JD <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
      <article className="prose prose-invert prose-sm max-w-none prose-headings:scroll-m-20 prose-h1:text-2xl prose-h2:text-lg prose-h3:text-base prose-a:text-blue-400 prose-table:text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.body}</ReactMarkdown>
      </article>
    </div>
  );
}
