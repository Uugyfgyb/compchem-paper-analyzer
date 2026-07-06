import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, FileText, History, Key, CheckCircle, ArrowRight, Beaker } from "lucide-react";

function ApiConfigPanel({ onComplete }: { onComplete: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("compchem_api_key");
    if (stored) {
      setApiKey(stored);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("compchem_api_key", apiKey.trim());
      setSaved(true);
      setTimeout(onComplete, 600);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("compchem_use_builtin", "true");
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(oklch(0.9 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0 0) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Main title - bottom left anchor */}
      <div className="fixed bottom-8 left-8 md:bottom-12 md:left-12 z-10">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white/90 tracking-tight leading-none">
          CompChem
        </h1>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white/90 tracking-tight leading-none">
          Analyzer
        </h1>
      </div>

      {/* Subtitle - top right */}
      <div className="fixed top-8 right-8 md:top-12 md:right-12 z-10 text-right">
        <p className="text-xs md:text-sm font-light tracking-[0.3em] uppercase text-white/50">
          Computational Chemistry
        </p>
        <p className="text-xs md:text-sm font-light tracking-[0.3em] uppercase text-white/40 mt-1">
          Deep Paper Analysis
        </p>
      </div>

      {/* Center config card */}
      <div className="relative z-20 w-full max-w-md mx-4">
        <div className="glass-card rounded-2xl p-8 md:p-10 teal-glow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">API Configuration</h2>
              <p className="text-xs text-muted-foreground">Configure your LLM access</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Enter your OpenAI API Key to power the deep analysis engine. 
            Alternatively, you can use the built-in platform model.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                OpenAI API Key
              </label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
                className="bg-background/50 border-border/50 focus:border-accent h-11"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-medium transition-all duration-200"
            >
              {saved ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Saved
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Save & Continue <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-transparent text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full h-11 border-border/40 text-muted-foreground hover:text-foreground hover:border-accent/50 transition-all duration-200"
            >
              <Beaker className="w-4 h-4 mr-2" />
              Use Built-in Model
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Please upload a PDF or Word document.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {};
      const storedKey = localStorage.getItem("compchem_api_key");
      if (storedKey) {
        headers["x-openai-api-key"] = storedKey;
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      navigate(`/analysis/${data.paperId}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [navigate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm">
          <Beaker className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Sign In Required</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Please sign in to upload and analyze papers.
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(oklch(0.9 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0 0) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* Main title - bottom left */}
      <div className="fixed bottom-8 left-8 md:bottom-12 md:left-12 z-10 pointer-events-none">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white/[0.07] tracking-tight leading-none select-none">
          CompChem
        </h1>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white/[0.07] tracking-tight leading-none select-none">
          Analyzer
        </h1>
      </div>

      {/* Subtitle - top right */}
      <div className="fixed top-8 right-8 md:top-12 md:right-12 z-10 text-right">
        <p className="text-[10px] md:text-xs font-light tracking-[0.3em] uppercase text-white/40">
          Computational Chemistry
        </p>
        <p className="text-[10px] md:text-xs font-light tracking-[0.3em] uppercase text-white/30 mt-0.5">
          Deep Analysis Platform
        </p>
      </div>

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Beaker className="w-4 h-4 text-accent" />
          </div>
          <span className="text-sm font-medium text-foreground/80">CompChem Analyzer</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/history")}
            className="border-border/40 text-muted-foreground hover:text-foreground hover:border-accent/50 gap-2"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </Button>
          {user && (
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-xs font-medium text-accent">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-20 flex flex-col items-center justify-center px-6 pt-12 md:pt-20 pb-32">
        {/* Hero text */}
        <div className="text-center mb-12 max-w-2xl">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            Deep Paper Analysis
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Upload your computational chemistry paper. Our AI engine identifies every research direction 
            and generates comprehensive, structured analysis reports with full depth.
          </p>
        </div>

        {/* Upload zone */}
        <div
          className={`w-full max-w-xl transition-all duration-300 ${dragActive ? 'scale-[1.02]' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <label className={`
            glass-card rounded-2xl p-12 md:p-16 flex flex-col items-center justify-center cursor-pointer
            transition-all duration-300 group
            ${dragActive ? 'teal-glow border-accent/50' : 'hover:border-accent/30'}
            ${uploading ? 'pointer-events-none opacity-70' : ''}
          `}>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleFileInput}
              disabled={uploading}
            />

            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
              ${dragActive ? 'bg-accent/30 scale-110' : 'bg-accent/10 group-hover:bg-accent/20'}
            `}>
              {uploading ? (
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className={`w-7 h-7 transition-colors duration-300 ${dragActive ? 'text-accent' : 'text-muted-foreground group-hover:text-accent'}`} />
              )}
            </div>

            <p className="text-base font-medium text-foreground mb-2">
              {uploading ? "Uploading & Analyzing..." : "Drop your paper here"}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploading ? "This may take a moment" : "PDF or Word document — up to 30MB"}
            </p>

            {uploadError && (
              <p className="text-xs text-destructive mt-4 bg-destructive/10 px-3 py-1.5 rounded-lg">
                {uploadError}
              </p>
            )}
          </label>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 w-full max-w-3xl">
          <div className="glass-card rounded-xl p-5 text-center">
            <FileText className="w-5 h-5 text-accent mx-auto mb-3" />
            <h3 className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Direction Identification</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Auto-detect DFT, MD, QC, Monte Carlo and more
            </p>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <Beaker className="w-5 h-5 text-accent mx-auto mb-3" />
            <h3 className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">Deep Analysis</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Structured reports with formulas and methodology
            </p>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <History className="w-5 h-5 text-accent mx-auto mb-3" />
            <h3 className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">History & Storage</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              All analyses saved for future reference
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const hasKey = localStorage.getItem("compchem_api_key");
    const useBuiltin = localStorage.getItem("compchem_use_builtin");
    if (hasKey || useBuiltin) {
      setConfigured(true);
    }
  }, []);

  if (!configured) {
    return <ApiConfigPanel onComplete={() => setConfigured(true)} />;
  }

  return <MainDashboard />;
}
