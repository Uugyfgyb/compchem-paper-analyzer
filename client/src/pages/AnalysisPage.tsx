import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, Beaker, FileText, Clock, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type AnalysisStatus = "pending" | "analyzing" | "completed" | "failed";

function StatusBadge({ status }: { status: AnalysisStatus }) {
  const config = {
    pending: { icon: Clock, label: "Pending", cls: "text-muted-foreground bg-muted/50" },
    analyzing: { icon: Loader2, label: "Analyzing", cls: "text-accent bg-accent/10" },
    completed: { icon: CheckCircle, label: "Complete", cls: "text-green-400 bg-green-400/10" },
    failed: { icon: AlertCircle, label: "Failed", cls: "text-destructive bg-destructive/10" },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${c.cls}`}>
      <Icon className={`w-3 h-3 ${status === "analyzing" ? "animate-spin" : ""}`} />
      {c.label}
    </span>
  );
}

function DirectionContent({ content }: { content: string | null }) {
  if (!content) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Generating analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-content prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const paperId = parseInt(params.id || "0");
  const [activeDirection, setActiveDirection] = useState<number>(0);

  const { data: paper, isLoading: paperLoading } = trpc.paper.getById.useQuery(
    { id: paperId },
    { enabled: paperId > 0, refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "completed" || data.status === "failed")) return false;
      return 3000;
    }}
  );

  const { data: analyses, isLoading: analysesLoading } = trpc.paper.getAnalyses.useQuery(
    { paperId },
    { enabled: paperId > 0, refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.length > 0 && data.every(a => a.status === "completed" || a.status === "failed")) return false;
      return 3000;
    }}
  );

  if (paperLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Paper Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">This analysis does not exist or you don't have access.</p>
          <Button onClick={() => navigate("/")} variant="outline" className="border-border/40">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const completedCount = analyses?.filter(a => a.status === "completed").length || 0;
  const totalCount = analyses?.length || 0;

  return (
    <div className="min-h-screen relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(oklch(0.9 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0 0) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* Fixed title - bottom left (watermark style) */}
      <div className="fixed bottom-8 left-8 md:bottom-12 md:left-12 z-10 pointer-events-none">
        <h1 className="text-2xl md:text-4xl font-black text-white/[0.05] tracking-tight leading-none select-none">
          CompChem
        </h1>
        <h1 className="text-2xl md:text-4xl font-black text-white/[0.05] tracking-tight leading-none select-none">
          Analyzer
        </h1>
      </div>

      {/* Subtitle - top right */}
      <div className="fixed top-8 right-8 md:top-12 md:right-12 z-10 text-right pointer-events-none">
        <p className="text-[10px] md:text-xs font-light tracking-[0.3em] uppercase text-white/40">
          Computational Chemistry
        </p>
        <p className="text-[10px] md:text-xs font-light tracking-[0.3em] uppercase text-white/30 mt-0.5">
          Deep Analysis Platform
        </p>
      </div>

      {/* Top bar */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <StatusBadge status={paper.status as AnalysisStatus} />
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-20 px-6 md:px-12 lg:px-20 pb-24 max-w-6xl mx-auto">
        {/* Paper overview card */}
        <div className="glass-card rounded-2xl p-6 md:p-8 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 mt-1">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-foreground leading-tight mb-2">
                {paper.title || paper.fileName}
              </h2>
              {paper.abstract && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {paper.abstract}
                </p>
              )}
            </div>
          </div>

          {/* Keywords */}
          {paper.keywords && paper.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(paper.keywords as string[]).map((kw: string, i: number) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Progress */}
          {totalCount > 0 && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Analysis Progress</span>
                <span className="text-xs font-medium text-foreground">{completedCount}/{totalCount}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Direction tabs and content */}
        {analyses && analyses.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Direction sidebar/tabs */}
            <div className="lg:w-64 shrink-0">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3 px-1">
                Research Directions
              </h3>
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {analyses.map((analysis, index) => (
                  <button
                    key={analysis.id}
                    onClick={() => setActiveDirection(index)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 shrink-0 lg:shrink lg:w-full
                      ${activeDirection === index
                        ? 'glass-card border-accent/30 teal-glow'
                        : 'hover:bg-muted/30 border border-transparent'
                      }
                    `}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      analysis.status === "completed" ? "bg-green-400" :
                      analysis.status === "analyzing" ? "bg-accent animate-pulse" :
                      analysis.status === "failed" ? "bg-destructive" : "bg-muted-foreground/50"
                    }`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${activeDirection === index ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {analysis.directionCn || analysis.direction}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 truncate">
                        {analysis.direction}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active direction content */}
            <div className="flex-1 min-w-0">
              {analyses[activeDirection] && (
                <div className="glass-card rounded-2xl p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-foreground">
                        {analyses[activeDirection].directionCn || analyses[activeDirection].direction}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analyses[activeDirection].summary}
                      </p>
                    </div>
                    <StatusBadge status={analyses[activeDirection].status as AnalysisStatus} />
                  </div>

                  <DirectionContent content={analyses[activeDirection].content} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading state when no analyses yet */}
        {(!analyses || analyses.length === 0) && !analysesLoading && paper.status === "analyzing" && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Identifying research directions...</p>
            <p className="text-xs text-muted-foreground/70 mt-2">This usually takes 15-30 seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}
