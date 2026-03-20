import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
});

// AssemblyAI Universal-3 Pro pricing: $0.21/hour = $0.0000583/second
const COST_PER_SECOND = 0.21 / 3600;

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: NextRequest) {
  try {
    // Auth check (defense-in-depth, middleware also checks)
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "AssemblyAI API key not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Server-side MIME type validation
    const mimeType = file.type;
    if (!mimeType.startsWith("audio/") && !mimeType.startsWith("video/")) {
      return NextResponse.json(
        { error: `Invalid file type "${mimeType}". Only audio and video files are accepted.` },
        { status: 400 }
      );
    }

    // Server-side file size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 500MB.` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to AssemblyAI
    const uploadUrl = await client.files.upload(buffer);

    // Transcribe with speaker diarization using Universal-3 Pro (best model)
    const transcript = await client.transcripts.transcribe({
      audio_url: uploadUrl,
      speech_model: "best",
      speaker_labels: true,
      language_detection: true,
    });

    if (transcript.status === "error") {
      return NextResponse.json(
        { error: transcript.error || "Transcription failed" },
        { status: 500 }
      );
    }

    // Calculate cost
    const durationSeconds = (transcript.audio_duration || 0);
    const transcriptionCost = durationSeconds * COST_PER_SECOND;

    // Map utterances
    const utterances = (transcript.utterances || []).map((u) => ({
      speaker: `Speaker ${u.speaker}`,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    }));

    // Count unique speakers
    const speakers = new Set(utterances.map((u) => u.speaker));

    // Create default speaker labels
    const speakerLabels: Record<string, string> = {};
    speakers.forEach((s) => {
      speakerLabels[s] = s;
    });

    return NextResponse.json({
      transcriptId: transcript.id,
      utterances,
      fullText: transcript.text || "",
      duration: (transcript.audio_duration || 0) * 1000, // Convert to ms
      speakerCount: speakers.size,
      speakerLabels,
      cost: {
        transcription: Math.round(transcriptionCost * 10000) / 10000,
        summary: 0,
        total: Math.round(transcriptionCost * 10000) / 10000,
      },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe file. Please try again." },
      { status: 500 }
    );
  }
}
