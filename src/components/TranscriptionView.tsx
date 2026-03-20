"use client";

import { useState, useRef } from "react";
import { TranscriptionResult } from "@/lib/types";
import { formatTimestamp, formatDuration } from "@/lib/format";
import { Clock, Users, MessageSquare, Edit3, Check, Download } from "lucide-react";

// Speaker colors
const SPEAKER_COLORS = [
  "from-purple-400 to-purple-600",
  "from-blue-400 to-blue-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-amber-600",
  "from-pink-400 to-pink-600",
  "from-cyan-400 to-cyan-600",
  "from-rose-400 to-rose-600",
  "from-indigo-400 to-indigo-600",
];

const SPEAKER_BG_COLORS = [
  "bg-purple-500/10 border-purple-500/20",
  "bg-blue-500/10 border-blue-500/20",
  "bg-emerald-500/10 border-emerald-500/20",
  "bg-amber-500/10 border-amber-500/20",
  "bg-pink-500/10 border-pink-500/20",
  "bg-cyan-500/10 border-cyan-500/20",
  "bg-rose-500/10 border-rose-500/20",
  "bg-indigo-500/10 border-indigo-500/20",
];

interface TranscriptionViewProps {
  transcription: TranscriptionResult;
  onSpeakerLabelChange: (labels: Record<string, string>) => void;
}

export default function TranscriptionView({
  transcription,
  onSpeakerLabelChange,
}: TranscriptionViewProps) {
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [labels, setLabels] = useState(transcription.speakerLabels);
  const escapePressedRef = useRef(false);

  const speakers = Object.keys(labels);

  const getSpeakerIndex = (speaker: string) => {
    return speakers.indexOf(speaker) % SPEAKER_COLORS.length;
  };

  const handleEditStart = (speaker: string) => {
    setEditingSpeaker(speaker);
    setEditValue(labels[speaker] || speaker);
    escapePressedRef.current = false;
  };

  const handleEditSave = () => {
    if (escapePressedRef.current) return;
    if (editingSpeaker && editValue.trim()) {
      const newLabels = { ...labels, [editingSpeaker]: editValue.trim() };
      setLabels(newLabels);
      onSpeakerLabelChange(newLabels);
    }
    setEditingSpeaker(null);
  };

  const handleEditCancel = () => {
    escapePressedRef.current = true;
    setEditingSpeaker(null);
  };

  const handleExport = () => {
    const lines = transcription.utterances.map((u) => {
      const name = labels[u.speaker] || u.speaker;
      const time = formatTimestamp(u.start);
      return `[${time}] ${name}: ${u.text}`;
    });
    const text = lines.join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transcription.fileName.replace(/\.[^/.]+$/, "")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4">
        <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-purple-300" />
          <span className="text-white/70 text-sm">
            {formatDuration(transcription.duration)}
          </span>
        </div>
        <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3">
          <Users className="w-4 h-4 text-blue-300" />
          <span className="text-white/70 text-sm">
            {transcription.speakerCount} speakers
          </span>
        </div>
        <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-emerald-300" />
          <span className="text-white/70 text-sm">
            {transcription.utterances.length} segments
          </span>
        </div>
        <button
          onClick={handleExport}
          className="glass rounded-2xl px-5 py-3 flex items-center gap-3 glass-hover"
        >
          <Download className="w-4 h-4 text-white/50" />
          <span className="text-white/70 text-sm">Export .txt</span>
        </button>
      </div>

      {/* Speaker labels */}
      <div className="glass rounded-2xl p-5 border border-purple-500/20 animate-fade-in">
        <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
          Rename Speakers
        </h3>
        <p className="text-white/30 text-xs mb-3">
          Click any speaker to set their name — names carry into summaries
        </p>
        <div className="flex flex-wrap gap-2">
          {speakers.map((speaker) => {
            const idx = getSpeakerIndex(speaker);
            const isEditing = editingSpeaker === speaker;

            return (
              <div key={speaker}>
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave();
                        if (e.key === "Escape") handleEditCancel();
                      }}
                      onBlur={handleEditSave}
                      className="px-3 py-1.5 rounded-xl glass-input text-white text-sm w-40"
                      autoFocus
                    />
                    <button
                      onClick={handleEditSave}
                      className="p-1.5 rounded-lg glass-button"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEditStart(speaker)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border ${SPEAKER_BG_COLORS[idx]} hover:opacity-80 transition-opacity`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${SPEAKER_COLORS[idx]}`}
                    />
                    <span className="text-white/80 text-sm">
                      {labels[speaker]}
                    </span>
                    <Edit3 className="w-3 h-3 text-white/30" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transcript */}
      <div className="glass rounded-2xl p-5 max-h-[600px] overflow-y-auto space-y-1">
        {transcription.utterances.map((utterance, i) => {
          const idx = getSpeakerIndex(utterance.speaker);
          const displayName = labels[utterance.speaker] || utterance.speaker;

          return (
            <div
              key={i}
              className="flex gap-4 py-3 hover:bg-white/[0.03] rounded-xl px-3 -mx-1 transition-colors"
            >
              <div className="flex-shrink-0 w-16 pt-0.5">
                <span className="text-white/25 text-xs font-mono">
                  {formatTimestamp(utterance.start)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-2 h-2 rounded-full bg-gradient-to-r ${SPEAKER_COLORS[idx]}`}
                  />
                  <span className="text-white/60 text-xs font-medium">
                    {displayName}
                  </span>
                </div>
                <p className="text-white/85 text-sm leading-relaxed">
                  {utterance.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
