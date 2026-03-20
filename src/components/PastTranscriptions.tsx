"use client";

import { TranscriptionResult } from "@/lib/types";
import { formatDuration, formatDate, formatCost } from "@/lib/format";
import {
  Clock,
  Users,
  Trash2,
  ChevronRight,
  FileAudio,
} from "lucide-react";

interface PastTranscriptionsProps {
  transcriptions: TranscriptionResult[];
  onSelect: (transcription: TranscriptionResult) => void;
  onDelete: (id: string) => void;
  activeId?: string;
}

export default function PastTranscriptions({
  transcriptions,
  onSelect,
  onDelete,
  activeId,
}: PastTranscriptionsProps) {
  if (transcriptions.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <FileAudio className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">No transcriptions yet</p>
        <p className="text-white/25 text-xs mt-1">
          Upload a Zoom recording to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transcriptions.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t)}
          className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group
            ${t.id === activeId
              ? "glass-strong border-purple-400/25"
              : "glass glass-hover"
            }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-white/85 text-sm font-medium truncate pr-4">
                {t.fileName}
              </h4>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-white/35 text-xs">
                  <Clock className="w-3 h-3" />
                  {formatDuration(t.duration)}
                </span>
                <span className="flex items-center gap-1.5 text-white/35 text-xs">
                  <Users className="w-3 h-3" />
                  {t.speakerCount}
                </span>
                <span className="text-white/25 text-xs">
                  {formatCost(t.cost.total)}
                </span>
              </div>
              <p className="text-white/25 text-xs mt-1.5">
                {formatDate(t.date)}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(t.id);
                }}
                className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
              </button>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
