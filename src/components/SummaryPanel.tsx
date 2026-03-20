"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TranscriptionResult, MeetingSummary, SUMMARY_TYPES, SummaryType } from "@/lib/types";
import { formatCost, generateId } from "@/lib/format";
import { saveSummary, getSummaries } from "@/lib/storage";
import {
  FileText,
  Users,
  CheckSquare,
  TrendingUp,
  Presentation,
  Loader2,
  Sparkles,
  Copy,
  Check,
  DollarSign,
  AlertCircle,
  X,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Users,
  CheckSquare,
  TrendingUp,
  Presentation,
};

interface SummaryPanelProps {
  transcription: TranscriptionResult;
  onCostUpdate: (cost: number) => void;
}

export default function SummaryPanel({
  transcription,
  onCostUpdate,
}: SummaryPanelProps) {
  const [generating, setGenerating] = useState<SummaryType | null>(null);
  const [summaries, setSummaries] = useState<Record<string, MeetingSummary>>(
    () => {
      const existing = getSummaries(transcription.id);
      const map: Record<string, MeetingSummary> = {};
      existing.forEach((s) => {
        map[s.type] = s;
      });
      return map;
    }
  );
  const [activeSummary, setActiveSummary] = useState<SummaryType | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build readable transcript
  const buildTranscript = () => {
    return transcription.utterances
      .map((u) => {
        const name =
          transcription.speakerLabels[u.speaker] || u.speaker;
        return `${name}: ${u.text}`;
      })
      .join("\n\n");
  };

  const handleGenerate = async (type: SummaryType) => {
    const config = SUMMARY_TYPES.find((s) => s.type === type);
    if (!config) return;

    setGenerating(type);
    setActiveSummary(type);
    setError(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: buildTranscript(),
          prompt: config.prompt,
          speakerLabels: transcription.speakerLabels,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate summary");
      }

      const data = await res.json();

      const summary: MeetingSummary = {
        id: generateId(),
        transcriptionId: transcription.id,
        type,
        content: data.content,
        generatedAt: new Date().toISOString(),
        cost: data.cost,
      };

      saveSummary(summary);

      // Fix cost double-counting: subtract old cost if regenerating
      const existingCost = summaries[type]?.cost || 0;
      onCostUpdate(data.cost - existingCost);

      setSummaries((prev) => ({ ...prev, [type]: summary }));
    } catch (err) {
      console.error("Summary generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setGenerating(null);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300/90 text-sm flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary type buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SUMMARY_TYPES.map((config) => {
          const Icon = ICON_MAP[config.icon] || FileText;
          const hasSummary = !!summaries[config.type];
          const isGenerating = generating === config.type;
          const isActive = activeSummary === config.type;

          return (
            <button
              key={config.type}
              onClick={() =>
                hasSummary
                  ? setActiveSummary(config.type)
                  : handleGenerate(config.type)
              }
              disabled={isGenerating}
              className={`
                p-4 rounded-2xl text-left transition-all duration-300
                ${isActive
                  ? "glass-strong border-purple-400/30"
                  : "glass glass-hover"
                }
                ${isGenerating ? "opacity-60" : ""}
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon className="w-5 h-5 text-purple-300" />
                {hasSummary && (
                  <span className="text-[10px] text-emerald-400/70 font-medium">
                    READY
                  </span>
                )}
              </div>
              <h4 className="text-white/90 text-sm font-medium">
                {config.label}
              </h4>
              <p className="text-white/40 text-xs mt-1 line-clamp-2">
                {config.description}
              </p>
              {isGenerating && (
                <div className="flex items-center gap-2 mt-3">
                  <Loader2 className="w-3 h-3 text-purple-300 animate-spin" />
                  <span className="text-purple-300 text-xs">Generating...</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active summary display */}
      {activeSummary && summaries[activeSummary] && (
        <div className="glass rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-300" />
              <h3 className="text-white/90 font-medium">
                {SUMMARY_TYPES.find((s) => s.type === activeSummary)?.label}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-white/30 text-xs">
                <DollarSign className="w-3 h-3" />
                <span>{formatCost(summaries[activeSummary].cost)}</span>
              </div>
              <button
                onClick={() =>
                  handleCopy(summaries[activeSummary].content)
                }
                className="p-2 rounded-xl glass-button"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/50" />
                )}
              </button>
            </div>
          </div>

          <div
            className="prose prose-invert prose-sm max-w-none
                        prose-headings:text-white/90 prose-headings:font-medium
                        prose-p:text-white/70 prose-p:leading-relaxed
                        prose-li:text-white/70 prose-li:marker:text-purple-400
                        prose-strong:text-white/90
                        prose-ul:space-y-1 prose-ol:space-y-1
                        text-white/70 leading-relaxed text-sm"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {summaries[activeSummary].content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
