"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  LogOut,
  Upload,
  FileText,
  History,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import TranscriptionView from "@/components/TranscriptionView";
import SummaryPanel from "@/components/SummaryPanel";
import PastTranscriptions from "@/components/PastTranscriptions";
import CostFooter from "@/components/CostFooter";
import { TranscriptionResult } from "@/lib/types";
import {
  saveTranscription,
  getTranscriptions,
  deleteTranscription,
  updateTranscriptionSpeakerLabels,
} from "@/lib/storage";
import { generateId } from "@/lib/format";

export type UploadStage = "idle" | "uploading" | "transcribing" | "done";

type Tab = "upload" | "transcript" | "summaries" | "history";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentTranscription, setCurrentTranscription] =
    useState<TranscriptionResult | null>(null);
  const [pastTranscriptions, setPastTranscriptions] = useState<
    TranscriptionResult[]
  >([]);
  const [summaryCost, setSummaryCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Middleware handles auth — just load data
    setPastTranscriptions(getTranscriptions());
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setUploadStage("uploading");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use XMLHttpRequest for upload progress tracking
      const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/transcribe");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.upload.onload = () => {
          setUploadStage("transcribing");
        };

        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(response);
            } else {
              reject(new Error(response.error || "Transcription failed"));
            }
          } catch {
            reject(new Error("Invalid server response"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error. Please try again."));
        xhr.send(formData);
      });

      const transcription: TranscriptionResult = {
        id: generateId(),
        fileName: file.name,
        date: new Date().toISOString(),
        duration: data.duration as number,
        utterances: data.utterances as TranscriptionResult["utterances"],
        fullText: data.fullText as string,
        speakerCount: data.speakerCount as number,
        speakerLabels: data.speakerLabels as Record<string, string>,
        cost: data.cost as TranscriptionResult["cost"],
      };

      saveTranscription(transcription);
      setCurrentTranscription(transcription);
      setPastTranscriptions(getTranscriptions());
      setSummaryCost(0);
      setUploadStage("done");
      setTimeout(() => {
        setUploadStage("idle");
        setActiveTab("transcript");
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process file"
      );
      setUploadStage("idle");
    }
  }, []);

  const handleSelectTranscription = useCallback(
    (transcription: TranscriptionResult) => {
      setCurrentTranscription(transcription);
      setSummaryCost(0);
      setActiveTab("transcript");
    },
    []
  );

  const handleDeleteTranscription = useCallback((id: string) => {
    deleteTranscription(id);
    setPastTranscriptions(getTranscriptions());
    setCurrentTranscription((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleSpeakerLabelChange = useCallback(
    (labels: Record<string, string>) => {
      if (currentTranscription) {
        updateTranscriptionSpeakerLabels(currentTranscription.id, labels);
        setCurrentTranscription((prev) =>
          prev ? { ...prev, speakerLabels: labels } : null
        );
      }
    },
    [currentTranscription]
  );

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "transcript", label: "Transcript", icon: FileText },
    { id: "summaries", label: "Summaries", icon: Mic },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold gradient-text-subtle hidden sm:block">
              Zoom Transcription Studio
            </h1>
          </div>

          {/* Tab navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled =
                (tab.id === "transcript" || tab.id === "summaries") &&
                !currentTranscription;

              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`
                    flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm transition-all duration-200
                    min-h-[44px]
                    ${isActive
                      ? "glass-strong text-white"
                      : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                    }
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] sm:text-sm">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold gradient-text mb-2">
                Upload Recording
              </h2>
              <p className="text-white/40">
                Drop your Zoom recording to transcribe with speaker separation
              </p>
            </div>

            <FileUpload
              onUpload={handleFileUpload}
              stage={uploadStage}
              uploadProgress={uploadProgress}
            />

            {error && (
              <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Tips */}
            <div className="mt-8 glass rounded-2xl p-6">
              <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-4">
                Tips for best results
              </h3>
              <ul className="space-y-3 text-sm text-white/40">
                <li className="flex items-start gap-3">
                  <span className="text-purple-400/60 mt-0.5">01</span>
                  <span>
                    Upload the audio file (.m4a) instead of video to save
                    processing time and credits
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-400/60 mt-0.5">02</span>
                  <span>
                    Zoom saves audio separately — check your Zoom recordings
                    folder for the .m4a file
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-400/60 mt-0.5">03</span>
                  <span>
                    After transcription, rename speakers to their real names for
                    better summaries
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-400/60 mt-0.5">04</span>
                  <span>
                    Try different summary types — &quot;Action Items&quot; for follow-ups,
                    &quot;Sales Meeting&quot; for client calls
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Transcript Tab */}
        {activeTab === "transcript" && currentTranscription && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold gradient-text mb-1">
                {currentTranscription.fileName}
              </h2>
              <p className="text-white/40 text-sm">
                Transcribed on{" "}
                {new Date(currentTranscription.date).toLocaleDateString()}
              </p>
            </div>
            <TranscriptionView
              transcription={currentTranscription}
              onSpeakerLabelChange={handleSpeakerLabelChange}
            />
          </div>
        )}

        {/* Summaries Tab */}
        {activeTab === "summaries" && currentTranscription && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold gradient-text mb-1">
                Generate Summaries
              </h2>
              <p className="text-white/40 text-sm">
                Choose a summary type for &quot;{currentTranscription.fileName}&quot;
              </p>
            </div>
            <SummaryPanel
              transcription={currentTranscription}
              onCostUpdate={(cost) =>
                setSummaryCost((prev) => prev + cost)
              }
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold gradient-text mb-1">
                Past Transcriptions
              </h2>
              <p className="text-white/40 text-sm">
                {pastTranscriptions.length} transcription
                {pastTranscriptions.length !== 1 ? "s" : ""} on file
              </p>
            </div>
            <PastTranscriptions
              transcriptions={pastTranscriptions}
              onSelect={handleSelectTranscription}
              onDelete={handleDeleteTranscription}
              activeId={currentTranscription?.id}
            />
          </div>
        )}

        {/* Cost Footer */}
        <CostFooter
          transcriptionCost={currentTranscription?.cost.transcription || 0}
          summaryCost={summaryCost}
        />
      </main>
    </div>
  );
}
