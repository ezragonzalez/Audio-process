"use client";

import { formatCost } from "@/lib/format";
import { DollarSign, Heart } from "lucide-react";

interface CostFooterProps {
  transcriptionCost: number;
  summaryCost: number;
}

export default function CostFooter({
  transcriptionCost,
  summaryCost,
}: CostFooterProps) {
  const totalCost = transcriptionCost + summaryCost;

  return (
    <footer className="mt-12 pb-8">
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Cost breakdown */}
          {totalCost > 0 && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400/60" />
                <span className="text-white/40 text-xs">Session cost:</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-white/30">
                  Transcription:{" "}
                  <span className="text-white/50">
                    {formatCost(transcriptionCost)}
                  </span>
                </span>
                <span className="text-white/15">|</span>
                <span className="text-white/30">
                  Summaries:{" "}
                  <span className="text-white/50">
                    {formatCost(summaryCost)}
                  </span>
                </span>
                <span className="text-white/15">|</span>
                <span className="text-white/40 font-medium">
                  Total:{" "}
                  <span className="text-emerald-400/70">
                    {formatCost(totalCost)}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Branding */}
          <div className="flex items-center gap-2 text-white/25 text-xs">
            <span>Transcription made available by</span>
            <span className="text-white/40 font-medium">Ezra Gonzalez</span>
            <Heart className="w-3 h-3 text-pink-400/40" />
          </div>
        </div>

        {totalCost > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] text-center">
            <p className="text-white/15 text-[10px]">
              Sponsored processing — powered by AssemblyAI & OpenAI
            </p>
          </div>
        )}
      </div>
    </footer>
  );
}
