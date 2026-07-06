import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, FileText, Clock, CheckCircle, Loader2, AlertCircle, Beaker } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function HistoryPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: papers, isLoading } = trpc.paper.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm">
          <Beaker className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Sign In Required</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Please sign in to view your analysis history.
          </p>
          <a href={getLoginUrl()}>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 px-6">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "analyzing":
      case "extracting": return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
      case "failed": return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(oklch(0.9 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0 0) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* Fixed title watermark */}
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
      </nav>

      {/* Content */}
      <div className="relative z-20 px-6 md:px-12 lg:px-20 pb-24 max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            Analysis History
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            All your previously analyzed papers
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : !papers || papers.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No papers analyzed yet.</p>
            <Button
              onClick={() => navigate("/")}
              className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Upload Your First Paper
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <button
                key={paper.id}
                onClick={() => navigate(`/analysis/${paper.id}`)}
                className="w-full glass-card rounded-xl p-5 text-left transition-all duration-200 hover:border-accent/30 hover:teal-glow group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-accent/20 transition-colors">
                    <FileText className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {paper.title || paper.fileName}
                      </h3>
                      {statusIcon(paper.status)}
                    </div>
                    {paper.abstract && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                        {paper.abstract}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground/70">
                        {new Date(paper.createdAt).toLocaleDateString()}
                      </span>
                      {paper.directions && (paper.directions as string[]).length > 0 && (
                        <span className="text-[10px] text-accent/70">
                          {(paper.directions as string[]).length} directions
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
