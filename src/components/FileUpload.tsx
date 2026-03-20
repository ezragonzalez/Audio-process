"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileAudio, FileVideo, AlertCircle, Loader2 } from "lucide-react";
import { formatFileSize } from "@/lib/format";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "audio/*": [".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac", ".wma"],
  "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"],
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

interface FileUploadProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
}

export default function FileUpload({ onUpload, isProcessing }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        setError("Invalid file type. Please upload an audio or video file.");
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
        );
        return;
      }

      onUpload(file);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          relative rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer
          transition-all duration-300 group
          ${isDragActive
            ? "border-purple-400/60 bg-purple-500/10 scale-[1.02]"
            : "border-white/15 hover:border-white/30 hover:bg-white/[0.04]"
          }
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {isProcessing ? (
            <>
              <div className="w-16 h-16 rounded-2xl glass-strong flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
              </div>
              <div>
                <p className="text-white/80 font-medium text-lg">
                  Processing your file...
                </p>
                <p className="text-white/40 text-sm mt-1">
                  This may take a few minutes depending on the file length
                </p>
              </div>
            </>
          ) : isDragActive ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                <Upload className="w-8 h-8 text-purple-300" />
              </div>
              <p className="text-purple-300 font-medium text-lg">
                Drop your file here
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center group-hover:bg-white/[0.12] transition-all">
                <Upload className="w-8 h-8 text-white/50 group-hover:text-white/70 transition-colors" />
              </div>
              <div>
                <p className="text-white/80 font-medium text-lg">
                  Drop your Zoom recording here
                </p>
                <p className="text-white/40 text-sm mt-1">
                  or click to browse files
                </p>
              </div>
              <div className="flex gap-6 mt-2">
                <div className="flex items-center gap-2 text-white/30 text-xs">
                  <FileAudio className="w-4 h-4" />
                  <span>MP3, M4A, WAV, OGG</span>
                </div>
                <div className="flex items-center gap-2 text-white/30 text-xs">
                  <FileVideo className="w-4 h-4" />
                  <span>MP4, MOV, AVI, MKV</span>
                </div>
              </div>
              <p className="text-white/20 text-xs mt-1">
                Max file size: 500MB
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300/90 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
