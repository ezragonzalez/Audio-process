import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "",
});

// AssemblyAI pricing: $0.00025 per second of audio
const COST_PER_SECOND = 0.00025;

export async function POST(req: NextRequest) {
  try {
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to AssemblyAI
    const uploadUrl = await client.files.upload(buffer);

    // Transcribe with speaker diarization
    const transcript = await client.transcripts.transcribe({
      audio_url: uploadUrl,
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
