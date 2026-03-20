"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  TranscriptionResult,
  MeetingSummary,
  SUMMARY_TYPES,
  CustomSummaryTypeConfig,
} from "@/lib/types";
import { formatCost, generateId } from "@/lib/format";
import {
  saveSummary,
  getSummaries,
  getCustomSummaryTypes,
  saveCustomSummaryType,
  deleteCustomSummaryType,
} from "@/lib/storage";
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
  Send,
  Save,
  Trash2,
  RefreshCw,
  MessageSquare,
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
  const [generating, setGenerating] = useState<string | null>(null);
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
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom prompt state
  const [customPrompt, setCustomPrompt] = useState("");
  const [customResult, setCustomResult] = useState<MeetingSummary | null>(null);
  const [customTypes, setCustomTypes] = useState<CustomSummaryTypeConfig[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  useEffect(() => {
    setCustomTypes(getCustomSummaryTypes());
  }, []);

  const buildTranscript = () => {
    return transcription.utterances
      .map((u) => {
        const name = transcription.speakerLabels[u.speaker] || u.speaker;
        return `${name}: ${u.text}`;
      })
      .join("\n\n");
  };

  const callSummarize = async (prompt: string) => {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: buildTranscript(),
        prompt,
        speakerLabels: transcription.speakerLabels,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to generate summary");
    }

    return await res.json();
  };

  const handleGenerate = async (type: string, prompt: string) => {
    setGenerating(type);
    setActiveSummary(type);
    setError(null);

    try {
      const data = await callSummarize(prompt);

      const summary: MeetingSummary = {
        id: generateId(),
        transcriptionId: transcription.id,
        type,
        content: data.content,
        generatedAt: new Date().toISOString(),
        cost: data.cost,
      };

      saveSummary(summary);

      const existingCost = summaries[type]?.cost || 0;
      onCostUpdate(data.cost - existingCost);

      setSummaries((prev) => ({ ...prev, [type]: summary }));
    } catch (err) {
      console.error("Summary generation error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate summary"
      );
    } finally {
      setGenerating(null);
    }
  };

  const handleBuiltInGenerate = (type: string) => {
    const config =
      SUMMARY_TYPES.find((s) => s.type === type) ||
      customTypes.find((s) => s.id === type);
    if (!config) return;
    const prompt = "prompt" in config ? config.prompt : "";
    if (summaries[type] && activeSummary !== type) {
      setActiveSummary(type);
      return;
    }
    handleGenerate(type, prompt);
  };

  const handleCustomGenerate = async () => {
    if (!customPrompt.trim()) return;

    setGenerating("custom");
    setActiveSummary("custom");
    setError(null);

    try {
      const data = await callSummarize(customPrompt.trim());

      const summary: MeetingSummary = {
        id: generateId(),
        transcriptionId: transcription.id,
        type: "custom",
        content: data.content,
        generatedAt: new Date().toISOString(),
        cost: data.cost,
      };

      saveSummary(summary);
      onCostUpdate(data.cost);
      setCustomResult(summary);
    } catch (err) {
      console.error("Custom summary error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate summary"
      );
    } finally {
      setGenerating(null);
    }
  };

  const handleSaveAsTemplate = () => {
    if (!saveLabel.trim() || !customPrompt.trim()) return;

    const config: CustomSummaryTypeConfig = {
      id: `custom-${generateId()}`,
      label: saveLabel.trim(),
      description: saveDescription.trim() || "Custom analysis template",
      prompt: customPrompt.trim(),
    };

    saveCustomSummaryType(config);
    setCustomTypes((prev) => [...prev, config]);
    setShowSaveForm(false);
    setSaveLabel("");
    setSaveDescription("");
  };

  const handleDeleteCustomType = (id: string) => {
    deleteCustomSummaryType(id);
    setCustomTypes((prev) => prev.filter((t) => t.id !== id));
    if (activeSummary === id) setActiveSummary(null);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get the active summary content to display
  const displaySummary =
    activeSummary === "custom"
      ? customResult
      : activeSummary
        ? summaries[activeSummary]
        : null;

  const displayLabel =
    activeSummary === "custom"
      ? "Custom Analysis"
      : SUMMARY_TYPES.find((s) => s.type === activeSummary)?.label ||
        customTypes.find((s) => s.id === activeSummary)?.label ||
        "Summary";

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

      {/* Built-in summary type buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SUMMARY_TYPES.map((config) => {
          const Icon = ICON_MAP[config.icon] || FileText;
          const hasSummary = !!summaries[config.type];
          const isGenerating = generating === config.type;
          const isActive = activeSummary === config.type;

          return (
            <button
              key={config.type}
              onClick={() => handleBuiltInGenerate(config.type)}
              disabled={!!generating}
              className={`
                p-4 rounded-2xl text-left transition-all duration-300
                ${isActive
                  ? "glass-strong border-purple-400/30"
                  : "glass glass-hover"
                }
                ${generating ? "opacity-60" : ""}
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

        {/* Custom saved types */}
        {customTypes.map((config) => {
          const hasSummary = !!summaries[config.id];
          const isGenerating = generating === config.id;
          const isActive = activeSummary === config.id;

          return (
            <button
              key={config.id}
              onClick={() => handleBuiltInGenerate(config.id)}
              disabled={!!generating}
              className={`
                p-4 rounded-2xl text-left transition-all duration-300 relative group
                ${isActive
                  ? "glass-strong border-purple-400/30"
                  : "glass glass-hover"
                }
                ${generating ? "opacity-60" : ""}
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <div className="flex items-center gap-1">
                  {hasSummary && (
                    <span className="text-[10px] text-emerald-400/70 font-medium">
                      READY
                    </span>
                  )}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomType(config.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </span>
                </div>
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

      {/* Custom prompt input */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-purple-300" />
          <h3 className="text-white/80 text-sm font-medium">
            Custom Analysis
          </h3>
        </div>
        <div className="space-y-3">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ask anything about this transcript... e.g. &quot;How was the emotional tone of the call?&quot;, &quot;Rate the sales technique used&quot;, &quot;Summarize in Spanish&quot;"
            className="w-full h-24 px-4 py-3 rounded-xl glass-input text-white/90 text-sm placeholder-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            disabled={!!generating}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleCustomGenerate}
              disabled={!customPrompt.trim() || !!generating}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                ${
                  customPrompt.trim() && !generating
                    ? "bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:opacity-90"
                    : "glass text-white/30 cursor-not-allowed"
                }
              `}
            >
              {generating === "custom" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
            {customPrompt.trim() && customResult && (
              <button
                onClick={() => setShowSaveForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm glass glass-hover text-white/60 hover:text-white/90 transition-all"
              >
                <Save className="w-4 h-4" />
                Save as Template
              </button>
            )}
          </div>
        </div>

        {/* Save as template form */}
        {showSaveForm && (
          <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3 animate-fade-in">
            <h4 className="text-white/70 text-xs font-medium uppercase tracking-wider">
              Save as Reusable Template
            </h4>
            <input
              type="text"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder="Template name (e.g. Emotional Intelligence Report)"
              className="w-full px-3 py-2 rounded-lg glass-input text-white/90 text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
            <input
              type="text"
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full px-3 py-2 rounded-lg glass-input text-white/90 text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAsTemplate}
                disabled={!saveLabel.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveForm(false);
                  setSaveLabel("");
                  setSaveDescription("");
                }}
                className="px-4 py-2 rounded-lg text-white/40 text-sm hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active summary display */}
      {displaySummary && (
        <div className="glass rounded-2xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-300" />
              <h3 className="text-white/90 font-medium">{displayLabel}</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-white/30 text-xs">
                <DollarSign className="w-3 h-3" />
                <span>{formatCost(displaySummary.cost)}</span>
              </div>
              {activeSummary && activeSummary !== "custom" && (
                <button
                  onClick={() => {
                    const config =
                      SUMMARY_TYPES.find((s) => s.type === activeSummary) ||
                      customTypes.find((s) => s.id === activeSummary);
                    if (config) {
                      handleGenerate(
                        "type" in config ? config.type : config.id,
                        config.prompt
                      );
                    }
                  }}
                  disabled={!!generating}
                  className="p-2 rounded-xl glass-button"
                  title="Regenerate"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-white/50 ${generating === activeSummary ? "animate-spin" : ""}`}
                  />
                </button>
              )}
              <button
                onClick={() => handleCopy(displaySummary.content)}
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
              {displaySummary.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
